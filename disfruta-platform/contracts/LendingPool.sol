// contracts/LendingPool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Loan.sol";
import "./LoanFactory.sol";

/**
 * @title LendingPool
 * @dev Collective investment pool for auto-investing and portfolio management
 * @dev Allows lenders to deposit funds and automatically invest in approved loans
 */
contract LendingPool is ReentrancyGuard, Pausable, AccessControl {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    
    // Pool configuration
    struct PoolSettings {
        uint256 minInvestmentAmount;     // Minimum deposit amount
        uint256 maxRiskLevel;            // Maximum risk level for auto-investment
        uint256 targetUtilizationRate;   // Target percentage of funds to invest
        uint256 managementFeeRate;       // Annual management fee in basis points
        uint256 performanceFeeRate;      // Performance fee in basis points
        bool autoInvestEnabled;          // Whether auto-investment is active
    }
    
    // Lender information
    struct LenderInfo {
        uint256 totalDeposited;      // Total amount deposited by lender
        uint256 totalWithdrawn;      // Total amount withdrawn by lender
        uint256 shareBalance;        // Current share balance
        uint256 lastDepositTime;     // Timestamp of last deposit
        uint256 totalReturns;        // Total returns earned
        bool autoInvestEnabled;      // Auto-investment preference
        uint256 riskTolerance;       // Risk tolerance level (1-10)
    }
    
    // Pool state variables
    PoolSettings public poolSettings;
    LoanFactory public loanFactory;
    
    // Financial tracking
    uint256 public totalPoolValue;           // Total value of the pool
    uint256 public totalShares;              // Total shares outstanding
    uint256 public totalDeposits;            // Total deposits received
    uint256 public totalWithdrawals;         // Total withdrawals processed
    uint256 public totalInvested;            // Total amount invested in loans
    uint256 public totalReturns;             // Total returns generated
    uint256 public availableBalance;         // Available cash for investment
    
    // Mappings
    mapping(address => LenderInfo) public lenders;
    mapping(address => uint256) public loanInvestments; // Track investments per loan
    address[] public activeLenders;
    address[] public investedLoans;
    
    // Events
    event Deposit(address indexed lender, uint256 amount, uint256 shares);
    event Withdrawal(address indexed lender, uint256 amount, uint256 shares);
    event AutoInvestment(address indexed loan, uint256 amount, uint256 expectedReturn);
    event ReturnsDistributed(uint256 totalAmount, uint256 timestamp);
    event PoolSettingsUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event LenderAdded(address indexed lender);
    event LenderRemoved(address indexed lender);
    
    // Custom errors
    error InsufficientDeposit();
    error InsufficientBalance();
    error InvalidWithdrawalAmount();
    error AutoInvestDisabled();
    error InvalidRiskLevel();
    error PoolCapacityExceeded();
    
    constructor(address _loanFactory) {
        require(_loanFactory != address(0), "Invalid loan factory address");
        
        loanFactory = LoanFactory(_loanFactory);
        
        // Initialize default pool settings
        poolSettings = PoolSettings({
            minInvestmentAmount: 100 * 10**18,    // $100 minimum
            maxRiskLevel: 7,                       // Medium-high risk tolerance
            targetUtilizationRate: 8000,           // 80% target utilization
            managementFeeRate: 100,                // 1% annual management fee
            performanceFeeRate: 1000,              // 10% performance fee
            autoInvestEnabled: true
        });
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(POOL_MANAGER_ROLE, msg.sender);
    }
    
    /**
     * @dev Allows lenders to deposit funds into the pool
     */
    function deposit() external payable nonReentrant whenNotPaused {
        if (msg.value < poolSettings.minInvestmentAmount) {
            revert InsufficientDeposit();
        }
        
        // Calculate shares to mint based on current pool value
        uint256 sharesToMint;
        if (totalShares == 0) {
            // First deposit: 1:1 ratio
            sharesToMint = msg.value;
        } else {
            // Subsequent deposits: proportional to pool value
            sharesToMint = (msg.value * totalShares) / totalPoolValue;
        }
        
        // Update lender information
        LenderInfo storage lender = lenders[msg.sender];
        if (lender.shareBalance == 0) {
            // New lender
            activeLenders.push(msg.sender);
            lender.riskTolerance = 5; // Default medium risk
            lender.autoInvestEnabled = true;
            emit LenderAdded(msg.sender);
        }
        
        lender.totalDeposited += msg.value;
        lender.shareBalance += sharesToMint;
        lender.lastDepositTime = block.timestamp;
        
        // Update pool state
        totalShares += sharesToMint;
        totalDeposits += msg.value;
        totalPoolValue += msg.value;
        availableBalance += msg.value;
        
        emit Deposit(msg.sender, msg.value, sharesToMint);
        
        // Trigger auto-investment if enabled
        if (poolSettings.autoInvestEnabled) {
            _triggerAutoInvestment();
        }
    }
    
    /**
     * @dev Allows lenders to withdraw their funds
     * @param _shares Number of shares to redeem
     */
    function withdraw(uint256 _shares) external nonReentrant {
        LenderInfo storage lender = lenders[msg.sender];
        
        if (_shares > lender.shareBalance) {
            revert InvalidWithdrawalAmount();
        }
        
        // Calculate withdrawal amount based on current pool value
        uint256 withdrawalAmount = (_shares * totalPoolValue) / totalShares;
        
        if (withdrawalAmount > availableBalance) {
            revert InsufficientBalance();
        }
        
        // Update lender information
        lender.shareBalance -= _shares;
        lender.totalWithdrawn += withdrawalAmount;
        
        // Update pool state
        totalShares -= _shares;
        totalWithdrawals += withdrawalAmount;
        totalPoolValue -= withdrawalAmount;
        availableBalance -= withdrawalAmount;
        
        // Remove lender if no shares remaining
        if (lender.shareBalance == 0) {
            _removeLender(msg.sender);
        }
        
        // Transfer funds to lender
        payable(msg.sender).transfer(withdrawalAmount);
        
        emit Withdrawal(msg.sender, withdrawalAmount, _shares);
    }
    
    /**
     * @dev Automatically invests available funds in approved loans
     */
    function _triggerAutoInvestment() private {
        if (!poolSettings.autoInvestEnabled) {
            return;
        }
        
        // Calculate target investment amount
        uint256 targetInvestment = (totalPoolValue * poolSettings.targetUtilizationRate) / 10000;
        uint256 investmentNeeded = targetInvestment > totalInvested ? 
            targetInvestment - totalInvested : 0;
        
        if (investmentNeeded == 0 || availableBalance < investmentNeeded) {
            return;
        }
        
        // Get available loans for investment
        address[] memory availableLoans = loanFactory.getAllLoans();
        
        for (uint256 i = 0; i < availableLoans.length && investmentNeeded > 0; i++) {
            address loanAddress = availableLoans[i];
            Loan loan = Loan(loanAddress);
            
            // Check if loan is suitable for investment
            if (_isLoanSuitableForInvestment(loan)) {
                uint256 investmentAmount = _calculateInvestmentAmount(loan, investmentNeeded);
                
                if (investmentAmount > 0) {
                    _investInLoan(loanAddress, investmentAmount);
                    investmentNeeded -= investmentAmount;
                }
            }
        }
    }
    
    /**
     * @dev Checks if a loan is suitable for pool investment
     */
    function _isLoanSuitableForInvestment(Loan loan) private view returns (bool) {
        // Check loan status
        if (loan.getStatus() != Loan.LoanStatus.Approved) {
            return false;
        }
        
        // Check if loan is approved by factory
        if (!loanFactory.isLoanApproved(address(loan))) {
            return false;
        }
        
        // Check funding progress
        uint256 fundingProgress = loan.getFundingProgress();
        if (fundingProgress >= 100) {
            return false; // Already fully funded
        }
        
        // Additional risk assessment could be added here
        return true;
    }
    
    /**
     * @dev Calculates appropriate investment amount for a loan
     */
    function _calculateInvestmentAmount(Loan loan, uint256 maxAmount) 
        private 
        view 
        returns (uint256) 
    {
        (, uint256 principal,,,,,uint256 totalFunded,) = loan.getLoanDetails();
        uint256 remainingFunding = principal - totalFunded;
        
        // Invest up to 10% of pool value in any single loan for diversification
        uint256 maxSingleInvestment = totalPoolValue / 10;
        
        // Return the minimum of: remaining funding needed, max single investment, available amount
        uint256 investmentAmount = remainingFunding;
        if (investmentAmount > maxSingleInvestment) {
            investmentAmount = maxSingleInvestment;
        }
        if (investmentAmount > maxAmount) {
            investmentAmount = maxAmount;
        }
        if (investmentAmount > availableBalance) {
            investmentAmount = availableBalance;
        }
        
        return investmentAmount;
    }
    
    /**
     * @dev Invests pool funds in a specific loan
     */
    function _investInLoan(address loanAddress, uint256 amount) private {
        Loan loan = Loan(loanAddress);
        
        // Record investment
        if (loanInvestments[loanAddress] == 0) {
            investedLoans.push(loanAddress);
        }
        loanInvestments[loanAddress] += amount;
        
        // Update pool state
        availableBalance -= amount;
        totalInvested += amount;
        
        // Make investment
        loan.fundLoan{value: amount}();
        
        emit AutoInvestment(loanAddress, amount, _calculateExpectedReturn(loan, amount));
    }
    
    /**
     * @dev Calculates expected return from loan investment
     */
    function _calculateExpectedReturn(Loan loan, uint256 investment) 
        private 
        view 
        returns (uint256) 
    {
        (, uint256 principal, uint256 interestRate, uint256 term,,,uint256 totalFunded,) = loan.getLoanDetails();
        
        // Calculate total interest for the loan
        uint256 totalInterest = (principal * interestRate * term) / (12 * 10000);
        
        // Calculate pool's share of interest based on investment proportion
        uint256 poolShare = (investment * totalInterest) / principal;
        
        return poolShare;
    }
    
    /**
     * @dev Processes returns from loan repayments
     */
    function processLoanReturns(address loanAddress) external payable {
        require(loanInvestments[loanAddress] > 0, "No investment in this loan");
        
        // Update pool value with returns
        totalPoolValue += msg.value;
        totalReturns += msg.value;
        availableBalance += msg.value;
        
        emit ReturnsDistributed(msg.value, block.timestamp);
    }
    
    /**
     * @dev Removes a lender from active lenders list
     */
    function _removeLender(address lenderAddress) private {
        for (uint256 i = 0; i < activeLenders.length; i++) {
            if (activeLenders[i] == lenderAddress) {
                activeLenders[i] = activeLenders[activeLenders.length - 1];
                activeLenders.pop();
                emit LenderRemoved(lenderAddress);
                break;
            }
        }
    }
    
    /**
     * @dev Updates pool settings (admin only)
     */
    function updatePoolSettings(
        uint256 _minInvestment,
        uint256 _maxRiskLevel,
        uint256 _targetUtilization,
        uint256 _managementFee,
        uint256 _performanceFee
    ) external onlyRole(ADMIN_ROLE) {
        require(_maxRiskLevel <= 10, "Invalid risk level");
        require(_targetUtilization <= 10000, "Invalid utilization rate");
        require(_managementFee <= 500, "Management fee too high"); // Max 5%
        require(_performanceFee <= 2000, "Performance fee too high"); // Max 20%
        
        poolSettings.minInvestmentAmount = _minInvestment;
        poolSettings.maxRiskLevel = _maxRiskLevel;
        poolSettings.targetUtilizationRate = _targetUtilization;
        poolSettings.managementFeeRate = _managementFee;
        poolSettings.performanceFeeRate = _performanceFee;
        
        emit PoolSettingsUpdated("multiple", 0, 0);
    }
    
    /**
     * @dev Enables or disables auto-investment
     */
    function toggleAutoInvestment(bool enabled) external onlyRole(ADMIN_ROLE) {
        poolSettings.autoInvestEnabled = enabled;
        emit PoolSettingsUpdated("autoInvestEnabled", enabled ? 0 : 1, enabled ? 1 : 0);
    }
    
    /**
     * @dev Updates lender's risk tolerance and auto-investment preference
     */
    function updateLenderPreferences(uint256 _riskTolerance, bool _autoInvest) external {
        require(_riskTolerance >= 1 && _riskTolerance <= 10, "Invalid risk tolerance");
        
        LenderInfo storage lender = lenders[msg.sender];
        require(lender.shareBalance > 0, "Not a pool member");
        
        lender.riskTolerance = _riskTolerance;
        lender.autoInvestEnabled = _autoInvest;
    }
    
    /**
     * @dev Emergency pause function (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // View functions
    
    /**
     * @dev Gets lender information
     */
    function getLenderInfo(address lenderAddress) 
        external 
        view 
        returns (LenderInfo memory) 
    {
        return lenders[lenderAddress];
    }
    
    /**
     * @dev Gets pool statistics
     */
    function getPoolStats() external view returns (
        uint256 _totalPoolValue,
        uint256 _totalShares,
        uint256 _availableBalance,
        uint256 _totalInvested,
        uint256 _totalReturns,
        uint256 _activeLendersCount
    ) {
        return (
            totalPoolValue,
            totalShares,
            availableBalance,
            totalInvested,
            totalReturns,
            activeLenders.length
        );
    }
    
    /**
     * @dev Gets current share price
     */
    function getSharePrice() external view returns (uint256) {
        if (totalShares == 0) return 10**18; // 1.0 for first deposit
        return (totalPoolValue * 10**18) / totalShares;
    }
    
    /**
     * @dev Gets all active lenders
     */
    function getActiveLenders() external view returns (address[] memory) {
        return activeLenders;
    }
    
    /**
     * @dev Gets all invested loans
     */
    function getInvestedLoans() external view returns (address[] memory) {
        return investedLoans;
    }
    
    /**
     * @dev Gets investment amount in specific loan
     */
    function getLoanInvestment(address loanAddress) external view returns (uint256) {
        return loanInvestments[loanAddress];
    }
}