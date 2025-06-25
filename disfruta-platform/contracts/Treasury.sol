// contracts/Treasury.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Treasury
 * @dev Manages platform fees, reserve funds, and revenue distribution
 * @dev Handles fee collection from loans and distributes to stakeholders
 */
contract Treasury is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions for access control
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");
    
    // Treasury configuration
    struct TreasuryConfig {
        uint256 reserveFundTargetRate;    // Target reserve fund as % of total loans
        uint256 operationalExpenseRate;   // % allocated to operational expenses
        uint256 developmentFundRate;      // % allocated to development
        uint256 stakeholderRewardRate;    // % allocated to stakeholder rewards
        uint256 emergencyFundRate;        // % allocated to emergency fund
        address payable operationalWallet;
        address payable developmentWallet;
        address payable stakeholderWallet;
    }
    
    // Financial tracking
    struct FinancialMetrics {
        uint256 totalFeesCollected;       // Total platform fees collected
        uint256 totalReserveFund;         // Current reserve fund balance
        uint256 totalOperationalFund;     // Operational expenses fund
        uint256 totalDevelopmentFund;     // Development fund balance
        uint256 totalStakeholderRewards;  // Stakeholder rewards distributed
        uint256 totalEmergencyFund;       // Emergency fund balance
        uint256 totalDistributed;         // Total funds distributed
    }
    
    // Default coverage tracking
    struct DefaultCoverage {
        uint256 totalDefaultsCovered;     // Total defaults covered by reserve
        uint256 totalDefaultAmount;       // Total amount of defaults
        uint256 coverageRatio;           // Current coverage ratio
        mapping(address => uint256) loanDefaults; // Defaults per loan
    }
    
    // State variables
    TreasuryConfig public config;
    FinancialMetrics public metrics;
    DefaultCoverage public defaultCoverage;
    
    // Fee tracking by source
    mapping(address => uint256) public feesBySource;  // Fees collected per loan/source
    mapping(address => bool) public authorizedCollectors; // Authorized fee collectors
    
    // Distribution tracking
    mapping(address => uint256) public stakeholderBalances;
    mapping(uint256 => uint256) public monthlyDistributions; // Month -> amount distributed
    
    // Events
    event FeeCollected(
        address indexed source,
        uint256 amount,
        string feeType,
        uint256 timestamp
    );
    
    event FundsDistributed(
        uint256 operational,
        uint256 development,
        uint256 stakeholder,
        uint256 emergency,
        uint256 timestamp
    );
    
    event DefaultCovered(
        address indexed loan,
        uint256 amount,
        uint256 remainingReserve,
        uint256 timestamp
    );
    
    event ReserveFundReplenished(uint256 amount, uint256 newBalance);
    event ConfigurationUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, string reason);
    
    // Custom errors
    error InsufficientReserveFunds();
    error InvalidConfiguration();
    error UnauthorizedFeeCollector();
    error InvalidDistributionRates();
    error ZeroAmountTransfer();
    
    constructor(
        address payable _operationalWallet,
        address payable _developmentWallet,
        address payable _stakeholderWallet
    ) {
        require(_operationalWallet != address(0), "Invalid operational wallet");
        require(_developmentWallet != address(0), "Invalid development wallet");
        require(_stakeholderWallet != address(0), "Invalid stakeholder wallet");
        
        // Initialize configuration with default values
        config = TreasuryConfig({
            reserveFundTargetRate: 300,        // 3% of total loans
            operationalExpenseRate: 4000,      // 40% of fees
            developmentFundRate: 2000,         // 20% of fees
            stakeholderRewardRate: 3000,       // 30% of fees
            emergencyFundRate: 1000,           // 10% of fees
            operationalWallet: _operationalWallet,
            developmentWallet: _developmentWallet,
            stakeholderWallet: _stakeholderWallet
        });
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        _grantRole(FEE_COLLECTOR_ROLE, msg.sender);
    }
    
    /**
     * @dev Collects platform fees from loans and other sources
     * @param _source Address of the fee source (loan contract, etc.)
     * @param _feeType Type of fee being collected
     */
    function collectFee(address _source, string memory _feeType) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        if (!hasRole(FEE_COLLECTOR_ROLE, msg.sender) && !authorizedCollectors[msg.sender]) {
            revert UnauthorizedFeeCollector();
        }
        
        if (msg.value == 0) {
            revert ZeroAmountTransfer();
        }
        
        // Record fee collection
        feesBySource[_source] += msg.value;
        metrics.totalFeesCollected += msg.value;
        
        emit FeeCollected(_source, msg.value, _feeType, block.timestamp);
        
        // Automatically distribute fees
        _distributeFees(msg.value);
    }
    
    /**
     * @dev Distributes collected fees according to configured rates
     * @param _amount Amount to distribute
     */
    function _distributeFees(uint256 _amount) private {
        uint256 operational = (_amount * config.operationalExpenseRate) / 10000;
        uint256 development = (_amount * config.developmentFundRate) / 10000;
        uint256 stakeholder = (_amount * config.stakeholderRewardRate) / 10000;
        uint256 emergency = (_amount * config.emergencyFundRate) / 10000;
        
        // Remaining amount goes to reserve fund
        uint256 reserve = _amount - operational - development - stakeholder - emergency;
        
        // Update metrics
        metrics.totalOperationalFund += operational;
        metrics.totalDevelopmentFund += development;
        metrics.totalStakeholderRewards += stakeholder;
        metrics.totalEmergencyFund += emergency;
        metrics.totalReserveFund += reserve;
        metrics.totalDistributed += _amount;
        
        // Transfer funds to designated wallets
        if (operational > 0) {
            config.operationalWallet.transfer(operational);
        }
        if (development > 0) {
            config.developmentWallet.transfer(development);
        }
        if (stakeholder > 0) {
            config.stakeholderWallet.transfer(stakeholder);
        }
        
        // Emergency and reserve funds remain in contract
        
        emit FundsDistributed(operational, development, stakeholder, emergency, block.timestamp);
    }
    
    /**
     * @dev Covers loan defaults using reserve funds
     * @param _loanAddress Address of the defaulted loan
     * @param _defaultAmount Amount of the default
     */
    function coverDefault(address _loanAddress, uint256 _defaultAmount) 
        external 
        onlyRole(TREASURER_ROLE) 
        nonReentrant 
    {
        if (_defaultAmount > metrics.totalReserveFund) {
            revert InsufficientReserveFunds();
        }
        
        // Update default tracking
        defaultCoverage.loanDefaults[_loanAddress] += _defaultAmount;
        defaultCoverage.totalDefaultsCovered += _defaultAmount;
        defaultCoverage.totalDefaultAmount += _defaultAmount;
        
        // Update reserve fund
        metrics.totalReserveFund -= _defaultAmount;
        
        // Calculate new coverage ratio
        if (defaultCoverage.totalDefaultAmount > 0) {
            defaultCoverage.coverageRatio = (defaultCoverage.totalDefaultsCovered * 10000) / 
                                          defaultCoverage.totalDefaultAmount;
        }
        
        // Transfer funds to cover default (to loan contract or lenders)
        payable(_loanAddress).transfer(_defaultAmount);
        
        emit DefaultCovered(_loanAddress, _defaultAmount, metrics.totalReserveFund, block.timestamp);
    }
    
    /**
     * @dev Replenishes reserve fund during low periods
     */
    function replenishReserveFund() external payable onlyRole(TREASURER_ROLE) {
        if (msg.value == 0) {
            revert ZeroAmountTransfer();
        }
        
        metrics.totalReserveFund += msg.value;
        
        emit ReserveFundReplenished(msg.value, metrics.totalReserveFund);
    }
    
    /**
     * @dev Updates treasury configuration
     */
    function updateConfiguration(
        uint256 _reserveTarget,
        uint256 _operationalRate,
        uint256 _developmentRate,
        uint256 _stakeholderRate,
        uint256 _emergencyRate
    ) external onlyRole(ADMIN_ROLE) {
        // Validate rates sum to 100%
        uint256 totalRate = _operationalRate + _developmentRate + _stakeholderRate + _emergencyRate;
        if (totalRate != 10000) {
            revert InvalidDistributionRates();
        }
        
        // Update configuration
        uint256 oldReserveTarget = config.reserveFundTargetRate;
        config.reserveFundTargetRate = _reserveTarget;
        config.operationalExpenseRate = _operationalRate;
        config.developmentFundRate = _developmentRate;
        config.stakeholderRewardRate = _stakeholderRate;
        config.emergencyFundRate = _emergencyRate;
        
        emit ConfigurationUpdated("reserveFundTargetRate", oldReserveTarget, _reserveTarget);
    }
    
    /**
     * @dev Updates wallet addresses for fund distribution
     */
    function updateWallets(
        address payable _operational,
        address payable _development,
        address payable _stakeholder
    ) external onlyRole(ADMIN_ROLE) {
        require(_operational != address(0), "Invalid operational wallet");
        require(_development != address(0), "Invalid development wallet");
        require(_stakeholder != address(0), "Invalid stakeholder wallet");
        
        config.operationalWallet = _operational;
        config.developmentWallet = _development;
        config.stakeholderWallet = _stakeholder;
    }
    
    /**
     * @dev Authorizes a new fee collector
     */
    function authorizeCollector(address _collector) external onlyRole(ADMIN_ROLE) {
        authorizedCollectors[_collector] = true;
    }
    
    /**
     * @dev Revokes fee collector authorization
     */
    function revokeCollector(address _collector) external onlyRole(ADMIN_ROLE) {
        authorizedCollectors[_collector] = false;
    }
    
    /**
     * @dev Emergency withdrawal function for critical situations
     */
    function emergencyWithdraw(
        address payable _recipient,
        uint256 _amount,
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount <= metrics.totalEmergencyFund, "Insufficient emergency funds");
        require(bytes(_reason).length > 0, "Reason required");
        
        metrics.totalEmergencyFund -= _amount;
        _recipient.transfer(_amount);
        
        emit EmergencyWithdrawal(_recipient, _amount, _reason);
    }
    
    /**
     * @dev Pause contract operations (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract operations (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // View functions
    
    /**
     * @dev Gets current treasury balance breakdown
     */
    function getTreasuryBalance() external view returns (
        uint256 totalBalance,
        uint256 reserveFund,
        uint256 emergencyFund,
        uint256 availableForDistribution
    ) {
        totalBalance = address(this).balance;
        reserveFund = metrics.totalReserveFund;
        emergencyFund = metrics.totalEmergencyFund;
        availableForDistribution = totalBalance - reserveFund - emergencyFund;
    }
    
    /**
     * @dev Gets financial metrics
     */
    function getFinancialMetrics() external view returns (FinancialMetrics memory) {
        return metrics;
    }
    
    /**
     * @dev Gets default coverage information
     */
    function getDefaultCoverage() external view returns (
        uint256 totalCovered,
        uint256 totalDefaults,
        uint256 coverageRatio
    ) {
        return (
            defaultCoverage.totalDefaultsCovered,
            defaultCoverage.totalDefaultAmount,
            defaultCoverage.coverageRatio
        );
    }
    
    /**
     * @dev Gets configuration settings
     */
    function getConfiguration() external view returns (TreasuryConfig memory) {
        return config;
    }
    
    /**
     * @dev Gets fees collected from specific source
     */
    function getFeesFromSource(address _source) external view returns (uint256) {
        return feesBySource[_source];
    }
    
    /**
     * @dev Checks if address is authorized collector
     */
    function isAuthorizedCollector(address _collector) external view returns (bool) {
        return hasRole(FEE_COLLECTOR_ROLE, _collector) || authorizedCollectors[_collector];
    }
    
    /**
     * @dev Gets reserve fund health ratio
     */
    function getReserveFundHealth() external view returns (uint256 healthRatio) {
        if (config.reserveFundTargetRate == 0) return 0;
        
        // This would require integration with loan factory to get total loan value
        // For now, return a simple ratio based on collected fees
        uint256 targetReserve = (metrics.totalFeesCollected * config.reserveFundTargetRate) / 10000;
        if (targetReserve == 0) return 10000; // 100% if no target set
        
        healthRatio = (metrics.totalReserveFund * 10000) / targetReserve;
        if (healthRatio > 10000) healthRatio = 10000; // Cap at 100%
    }
    
    /**
     * @dev Gets monthly distribution amount
     */
    function getMonthlyDistribution(uint256 _month) external view returns (uint256) {
        return monthlyDistributions[_month];
    }
    
    /**
     * @dev Fallback function to receive direct payments
     */
    receive() external payable {
        // Direct payments go to reserve fund
        metrics.totalReserveFund += msg.value;
        emit ReserveFundReplenished(msg.value, metrics.totalReserveFund);
    }
}