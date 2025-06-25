// contracts/LoanFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Loan.sol";
import "./UserRegistry.sol";
import "./CreditScoring.sol";

/**
 * @title LoanFactory
 * @dev Factory contract for creating and managing loan instances
 * @dev Implements security patterns: AccessControl, ReentrancyGuard, Pausable
 */
contract LoanFactory is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions for access control
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LOAN_APPROVER_ROLE = keccak256("LOAN_APPROVER_ROLE");
    
    // Contract references
    UserRegistry public userRegistry;
    CreditScoring public creditScoring;
    
    // Platform configuration
    uint256 public platformFeeRate = 100; // 1% in basis points (10000 = 100%)
    uint256 public reserveFundRate = 300; // 3% reserve fund
    uint256 public constant MAX_LOAN_AMOUNT = 50000 * 10**18; // $50,000 in wei
    uint256 public constant MIN_LOAN_AMOUNT = 1000 * 10**18; // $1,000 in wei
    uint256 public constant MAX_INTEREST_RATE = 3000; // 30% maximum APR
    uint256 public constant MIN_LOAN_TERM = 12; // 12 months minimum
    uint256 public constant MAX_LOAN_TERM = 60; // 60 months maximum
    
    // State variables
    mapping(address => address[]) public borrowerLoans;
    mapping(address => bool) public approvedLoans;
    address[] public allLoans;
    uint256 public totalLoansCreated;
    uint256 public totalActiveLoans;
    
    // Events
    event LoanCreated(
        address indexed loanContract,
        address indexed borrower,
        uint256 amount,
        uint256 interestRate,
        uint256 term,
        string purpose
    );
    
    event LoanApproved(
        address indexed loanContract,
        address indexed approver,
        uint256 timestamp
    );
    
    event LoanStatusChanged(
        address indexed loanContract,
        Loan.LoanStatus oldStatus,
        Loan.LoanStatus newStatus
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event ReserveFundRateUpdated(uint256 oldRate, uint256 newRate);
    
    // Custom errors for gas optimization
    error InvalidLoanAmount();
    error InvalidInterestRate();
    error InvalidLoanTerm();
    error BorrowerNotVerified();
    error LoanAlreadyApproved();
    error UnauthorizedAccess();
    error ContractPaused();
    
    constructor(address _userRegistry, address _creditScoring) {
        require(_userRegistry != address(0), "Invalid user registry address");
        require(_creditScoring != address(0), "Invalid credit scoring address");
        
        userRegistry = UserRegistry(_userRegistry);
        creditScoring = CreditScoring(_creditScoring);
        
        // Grant admin role to contract deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(LOAN_APPROVER_ROLE, msg.sender);
    }
    
    /**
     * @dev Creates a new loan contract instance
     * @param _amount Loan amount in wei
     * @param _interestRate Annual interest rate in basis points
     * @param _term Loan term in months
     * @param _purpose Purpose of the loan
     * @return loanAddress Address of the created loan contract
     */
    function createLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _term,
        string memory _purpose
    ) external nonReentrant whenNotPaused returns (address loanAddress) {
        // Validate input parameters
        if (_amount < MIN_LOAN_AMOUNT || _amount > MAX_LOAN_AMOUNT) {
            revert InvalidLoanAmount();
        }
        if (_interestRate > MAX_INTEREST_RATE) {
            revert InvalidInterestRate();
        }
        if (_term < MIN_LOAN_TERM || _term > MAX_LOAN_TERM) {
            revert InvalidLoanTerm();
        }
        
        // Verify borrower is KYC verified
        if (!userRegistry.isVerified(msg.sender)) {
            revert BorrowerNotVerified();
        }
        
        // Get credit score and calculate risk-adjusted rate
        uint256 creditScore = creditScoring.getCreditScore(msg.sender);
        uint256 adjustedRate = _calculateRiskAdjustedRate(_interestRate, creditScore);
        
        // Deploy new loan contract
        Loan newLoan = new Loan(
            msg.sender,
            _amount,
            adjustedRate,
            _term,
            _purpose,
            address(this),
            platformFeeRate
        );
        
        loanAddress = address(newLoan);
        
        // Update state
        borrowerLoans[msg.sender].push(loanAddress);
        allLoans.push(loanAddress);
        totalLoansCreated++;
        
        emit LoanCreated(
            loanAddress,
            msg.sender,
            _amount,
            adjustedRate,
            _term,
            _purpose
        );
        
        return loanAddress;
    }
    
    /**
     * @dev Approves a loan for funding
     * @param _loanAddress Address of the loan contract to approve
     */
    function approveLoan(address _loanAddress) 
        external 
        onlyRole(LOAN_APPROVER_ROLE) 
        whenNotPaused 
    {
        if (approvedLoans[_loanAddress]) {
            revert LoanAlreadyApproved();
        }
        
        Loan loan = Loan(_loanAddress);
        require(loan.getStatus() == Loan.LoanStatus.Pending, "Loan not in pending status");
        
        // Mark as approved
        approvedLoans[_loanAddress] = true;
        totalActiveLoans++;
        
        // Approve the loan contract
        loan.approveLoan();
        
        emit LoanApproved(_loanAddress, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Calculates risk-adjusted interest rate based on credit score
     * @param _baseRate Base interest rate
     * @param _creditScore Borrower's credit score
     * @return adjustedRate Risk-adjusted interest rate
     */
    function _calculateRiskAdjustedRate(uint256 _baseRate, uint256 _creditScore) 
        private 
        pure 
        returns (uint256 adjustedRate) 
    {
        // Credit score ranges: 300-850 (FICO scale)
        // Higher credit score = lower rate adjustment
        if (_creditScore >= 750) {
            // Excellent credit: -50 basis points
            adjustedRate = _baseRate > 50 ? _baseRate - 50 : _baseRate;
        } else if (_creditScore >= 700) {
            // Good credit: no adjustment
            adjustedRate = _baseRate;
        } else if (_creditScore >= 650) {
            // Fair credit: +100 basis points
            adjustedRate = _baseRate + 100;
        } else if (_creditScore >= 600) {
            // Poor credit: +200 basis points
            adjustedRate = _baseRate + 200;
        } else {
            // Very poor credit: +300 basis points
            adjustedRate = _baseRate + 300;
        }
        
        // Ensure rate doesn't exceed maximum
        if (adjustedRate > MAX_INTEREST_RATE) {
            adjustedRate = MAX_INTEREST_RATE;
        }
        
        return adjustedRate;
    }
    
    /**
     * @dev Updates platform fee rate (admin only)
     * @param _newFeeRate New fee rate in basis points
     */
    function updatePlatformFeeRate(uint256 _newFeeRate) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_newFeeRate <= 500, "Fee rate cannot exceed 5%");
        uint256 oldFee = platformFeeRate;
        platformFeeRate = _newFeeRate;
        emit PlatformFeeUpdated(oldFee, _newFeeRate);
    }
    
    /**
     * @dev Updates reserve fund rate (admin only)
     * @param _newReserveRate New reserve fund rate in basis points
     */
    function updateReserveFundRate(uint256 _newReserveRate) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_newReserveRate <= 1000, "Reserve rate cannot exceed 10%");
        uint256 oldRate = reserveFundRate;
        reserveFundRate = _newReserveRate;
        emit ReserveFundRateUpdated(oldRate, _newReserveRate);
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
    
    /**
     * @dev Gets all loans for a specific borrower
     * @param _borrower Address of the borrower
     * @return Array of loan contract addresses
     */
    function getBorrowerLoans(address _borrower) 
        external 
        view 
        returns (address[] memory) 
    {
        return borrowerLoans[_borrower];
    }
    
    /**
     * @dev Gets all loan contracts
     * @return Array of all loan contract addresses
     */
    function getAllLoans() external view returns (address[] memory) {
        return allLoans;
    }
    
    /**
     * @dev Checks if a loan is approved
     * @param _loanAddress Address of the loan contract
     * @return Boolean indicating approval status
     */
    function isLoanApproved(address _loanAddress) external view returns (bool) {
        return approvedLoans[_loanAddress];
    }
    
    /**
     * @dev Gets platform statistics
     * @return totalCreated Total loans created
     * @return totalActive Total active loans
     * @return platformFee Current platform fee rate
     * @return reserveRate Current reserve fund rate
     */
    function getPlatformStats() 
        external 
        view 
        returns (
            uint256 totalCreated,
            uint256 totalActive,
            uint256 platformFee,
            uint256 reserveRate
        ) 
    {
        return (
            totalLoansCreated,
            totalActiveLoans,
            platformFeeRate,
            reserveFundRate
        );
    }
}