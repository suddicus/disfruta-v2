// contracts/Loan.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Loan
 * @dev Individual loan contract with funding, repayment, and interest distribution logic
 * @dev Implements security patterns: ReentrancyGuard, Pausable, access controls
 */
contract Loan is ReentrancyGuard, Pausable, Ownable {
    // Loan status enumeration
    enum LoanStatus {
        Pending,     // Loan created, awaiting approval
        Approved,    // Loan approved, ready for funding
        Active,      // Loan fully funded and active
        Repaid,      // Loan fully repaid
        Defaulted    // Loan in default
    }
    
    // Loan parameters (immutable after creation)
    address public immutable borrower;
    uint256 public immutable principal;
    uint256 public immutable interestRate; // Annual rate in basis points
    uint256 public immutable termInMonths;
    uint256 public immutable monthlyPayment;
    uint256 public immutable totalRepaymentAmount;
    string public loanPurpose;
    uint256 public immutable createdAt;
    uint256 public immutable platformFeeRate;
    
    // Loan state variables
    LoanStatus public status;
    uint256 public totalFunded;
    uint256 public totalRepaid;
    uint256 public lastPaymentDate;
    uint256 public nextPaymentDue;
    uint256 public missedPayments;
    bool public fundingDeadlinePassed;
    
    // Funding management
    uint256 public constant FUNDING_PERIOD = 30 days;
    uint256 public fundingDeadline;
    mapping(address => uint256) public lenderContributions;
    address[] public lenders;
    uint256 public totalLenders;
    
    // Payment tracking
    struct Payment {
        uint256 amount;
        uint256 principal;
        uint256 interest;
        uint256 timestamp;
        uint256 paymentNumber;
    }
    
    Payment[] public paymentHistory;
    uint256 public currentPaymentNumber;
    
    // Constants
    uint256 public constant GRACE_PERIOD = 15 days;
    uint256 public constant DEFAULT_THRESHOLD = 90 days;
    uint256 public constant MIN_FUNDING_AMOUNT = 25 * 10**18; // $25 minimum
    
    // Events
    event LoanApproved(uint256 timestamp);
    event FundingReceived(address indexed lender, uint256 amount, uint256 totalFunded);
    event LoanFullyFunded(uint256 totalAmount, uint256 timestamp);
    event FundsWithdrawn(address indexed borrower, uint256 amount);
    event PaymentMade(
        uint256 indexed paymentNumber,
        uint256 amount,
        uint256 principalPortion,
        uint256 interestPortion,
        uint256 remainingBalance
    );
    event LoanRepaid(uint256 totalRepaid, uint256 timestamp);
    event LoanDefaulted(uint256 timestamp, uint256 missedPayments);
    event InterestDistributed(address indexed lender, uint256 amount);
    event RefundIssued(address indexed lender, uint256 amount);
    
    // Custom errors
    error LoanNotApproved();
    error LoanAlreadyFunded();
    error InsufficientFunding();
    error FundingDeadlineExpired();
    error InvalidPaymentAmount();
    error PaymentNotDue();
    error LoanAlreadyRepaid();
    error UnauthorizedAccess();
    error InvalidLenderAmount();
    
    constructor(
        address _borrower,
        uint256 _principal,
        uint256 _interestRate,
        uint256 _termInMonths,
        string memory _purpose,
        address _factory,
        uint256 _platformFeeRate
    ) {
        require(_borrower != address(0), "Invalid borrower address");
        require(_principal > 0, "Principal must be greater than 0");
        require(_interestRate > 0, "Interest rate must be greater than 0");
        require(_termInMonths > 0, "Term must be greater than 0");
        
        borrower = _borrower;
        principal = _principal;
        interestRate = _interestRate;
        termInMonths = _termInMonths;
        loanPurpose = _purpose;
        createdAt = block.timestamp;
        platformFeeRate = _platformFeeRate;
        
        // Calculate monthly payment using compound interest formula
        // M = P * [r(1+r)^n] / [(1+r)^n - 1]
        uint256 monthlyRate = _interestRate / 12 / 10000; // Convert to monthly decimal
        uint256 compound = _calculateCompoundFactor(monthlyRate, _termInMonths);
        monthlyPayment = (_principal * monthlyRate * compound) / (compound - 10**18);
        totalRepaymentAmount = monthlyPayment * _termInMonths;
        
        status = LoanStatus.Pending;
        
        // Transfer ownership to factory for management
        _transferOwnership(_factory);
    }
    
    /**
     * @dev Approves the loan for funding (factory only)
     */
    function approveLoan() external onlyOwner {
        if (status != LoanStatus.Pending) {
            revert LoanNotApproved();
        }
        
        status = LoanStatus.Approved;
        fundingDeadline = block.timestamp + FUNDING_PERIOD;
        nextPaymentDue = block.timestamp + 30 days; // First payment due in 30 days
        
        emit LoanApproved(block.timestamp);
    }
    
    /**
     * @dev Allows lenders to fund the loan
     */
    function fundLoan() external payable nonReentrant whenNotPaused {
        if (status != LoanStatus.Approved) {
            revert LoanNotApproved();
        }
        if (block.timestamp > fundingDeadline) {
            revert FundingDeadlineExpired();
        }
        if (msg.value < MIN_FUNDING_AMOUNT) {
            revert InvalidLenderAmount();
        }
        if (totalFunded + msg.value > principal) {
            revert LoanAlreadyFunded();
        }
        
        // Record lender contribution
        if (lenderContributions[msg.sender] == 0) {
            lenders.push(msg.sender);
            totalLenders++;
        }
        lenderContributions[msg.sender] += msg.value;
        totalFunded += msg.value;
        
        emit FundingReceived(msg.sender, msg.value, totalFunded);
        
        // Check if loan is fully funded
        if (totalFunded >= principal) {
            status = LoanStatus.Active;
            emit LoanFullyFunded(totalFunded, block.timestamp);
        }
    }
    
    /**
     * @dev Allows borrower to withdraw funded amount
     */
    function withdrawFunds() external nonReentrant {
        if (msg.sender != borrower) {
            revert UnauthorizedAccess();
        }
        if (status != LoanStatus.Active) {
            revert InsufficientFunding();
        }
        
        uint256 platformFee = (totalFunded * platformFeeRate) / 10000;
        uint256 withdrawAmount = totalFunded - platformFee;
        
        // Transfer funds to borrower (minus platform fee)
        payable(borrower).transfer(withdrawAmount);
        
        // Transfer platform fee to owner (factory/treasury)
        if (platformFee > 0) {
            payable(owner()).transfer(platformFee);
        }
        
        emit FundsWithdrawn(borrower, withdrawAmount);
    }
    
    /**
     * @dev Allows borrower to make loan payments
     */
    function makePayment() external payable nonReentrant {
        if (msg.sender != borrower) {
            revert UnauthorizedAccess();
        }
        if (status != LoanStatus.Active) {
            revert LoanAlreadyRepaid();
        }
        if (msg.value < monthlyPayment) {
            revert InvalidPaymentAmount();
        }
        
        // Calculate interest and principal portions
        uint256 remainingBalance = principal - _getTotalPrincipalPaid();
        uint256 interestPortion = (remainingBalance * interestRate) / (12 * 10000);
        uint256 principalPortion = msg.value - interestPortion;
        
        // Record payment
        currentPaymentNumber++;
        paymentHistory.push(Payment({
            amount: msg.value,
            principal: principalPortion,
            interest: interestPortion,
            timestamp: block.timestamp,
            paymentNumber: currentPaymentNumber
        }));
        
        totalRepaid += msg.value;
        lastPaymentDate = block.timestamp;
        nextPaymentDue = block.timestamp + 30 days;
        
        // Reset missed payments counter
        missedPayments = 0;
        
        emit PaymentMade(
            currentPaymentNumber,
            msg.value,
            principalPortion,
            interestPortion,
            remainingBalance - principalPortion
        );
        
        // Distribute interest to lenders
        _distributeInterest(interestPortion);
        
        // Check if loan is fully repaid
        if (totalRepaid >= totalRepaymentAmount) {
            status = LoanStatus.Repaid;
            emit LoanRepaid(totalRepaid, block.timestamp);
        }
    }
    
    /**
     * @dev Handles early loan payoff
     */
    function payoffLoan() external payable nonReentrant {
        if (msg.sender != borrower) {
            revert UnauthorizedAccess();
        }
        if (status != LoanStatus.Active) {
            revert LoanAlreadyRepaid();
        }
        
        uint256 remainingBalance = getRemainingBalance();
        if (msg.value < remainingBalance) {
            revert InvalidPaymentAmount();
        }
        
        // Calculate final interest
        uint256 interestPortion = remainingBalance - (principal - _getTotalPrincipalPaid());
        uint256 principalPortion = remainingBalance - interestPortion;
        
        // Record final payment
        currentPaymentNumber++;
        paymentHistory.push(Payment({
            amount: remainingBalance,
            principal: principalPortion,
            interest: interestPortion,
            timestamp: block.timestamp,
            paymentNumber: currentPaymentNumber
        }));
        
        totalRepaid += remainingBalance;
        status = LoanStatus.Repaid;
        
        // Distribute final interest
        _distributeInterest(interestPortion);
        
        // Refund excess payment
        if (msg.value > remainingBalance) {
            payable(borrower).transfer(msg.value - remainingBalance);
        }
        
        emit LoanRepaid(totalRepaid, block.timestamp);
    }
    
    /**
     * @dev Marks loan as defaulted (owner only)
     */
    function markAsDefaulted() external onlyOwner {
        if (status != LoanStatus.Active) {
            return;
        }
        
        // Check if loan is past due beyond threshold
        if (block.timestamp > nextPaymentDue + DEFAULT_THRESHOLD) {
            status = LoanStatus.Defaulted;
            emit LoanDefaulted(block.timestamp, missedPayments);
        }
    }
    
    /**
     * @dev Updates missed payments counter (owner only)
     */
    function updateMissedPayments() external onlyOwner {
        if (status == LoanStatus.Active && block.timestamp > nextPaymentDue + GRACE_PERIOD) {
            missedPayments++;
        }
    }
    
    /**
     * @dev Distributes interest payments to lenders proportionally
     */
    function _distributeInterest(uint256 interestAmount) private {
        for (uint256 i = 0; i < lenders.length; i++) {
            address lender = lenders[i];
            uint256 contribution = lenderContributions[lender];
            uint256 lenderShare = (interestAmount * contribution) / totalFunded;
            
            if (lenderShare > 0) {
                payable(lender).transfer(lenderShare);
                emit InterestDistributed(lender, lenderShare);
            }
        }
    }
    
    /**
     * @dev Calculates compound factor for monthly payment calculation
     */
    function _calculateCompoundFactor(uint256 rate, uint256 periods) 
        private 
        pure 
        returns (uint256) 
    {
        uint256 factor = 10**18; // Start with 1.0 in 18 decimals
        uint256 base = 10**18 + rate;
        
        // Calculate (1 + rate)^periods using exponentiation by squaring
        for (uint256 i = 0; i < periods; i++) {
            factor = (factor * base) / 10**18;
        }
        
        return factor;
    }
    
    /**
     * @dev Gets total principal paid so far
     */
    function _getTotalPrincipalPaid() private view returns (uint256) {
        uint256 totalPrincipal = 0;
        for (uint256 i = 0; i < paymentHistory.length; i++) {
            totalPrincipal += paymentHistory[i].principal;
        }
        return totalPrincipal;
    }
    
    /**
     * @dev Issues refunds to lenders if funding deadline expires
     */
    function issueRefunds() external onlyOwner {
        if (status != LoanStatus.Approved || block.timestamp <= fundingDeadline) {
            return;
        }
        
        if (totalFunded < principal) {
            fundingDeadlinePassed = true;
            
            // Refund all lenders
            for (uint256 i = 0; i < lenders.length; i++) {
                address lender = lenders[i];
                uint256 contribution = lenderContributions[lender];
                
                if (contribution > 0) {
                    lenderContributions[lender] = 0;
                    payable(lender).transfer(contribution);
                    emit RefundIssued(lender, contribution);
                }
            }
            
            totalFunded = 0;
            status = LoanStatus.Pending;
        }
    }
    
    // View functions
    
    /**
     * @dev Gets current loan status
     */
    function getStatus() external view returns (LoanStatus) {
        return status;
    }
    
    /**
     * @dev Gets remaining balance to be paid
     */
    function getRemainingBalance() public view returns (uint256) {
        if (status == LoanStatus.Repaid) {
            return 0;
        }
        
        uint256 principalPaid = _getTotalPrincipalPaid();
        uint256 remainingPrincipal = principal - principalPaid;
        
        // Calculate remaining interest based on remaining term
        uint256 paymentsRemaining = termInMonths - currentPaymentNumber;
        uint256 remainingInterest = (monthlyPayment * paymentsRemaining) - remainingPrincipal;
        
        return remainingPrincipal + remainingInterest;
    }
    
    /**
     * @dev Gets loan details
     */
    function getLoanDetails() external view returns (
        address _borrower,
        uint256 _principal,
        uint256 _interestRate,
        uint256 _termInMonths,
        uint256 _monthlyPayment,
        LoanStatus _status,
        uint256 _totalFunded,
        uint256 _totalRepaid
    ) {
        return (
            borrower,
            principal,
            interestRate,
            termInMonths,
            monthlyPayment,
            status,
            totalFunded,
            totalRepaid
        );
    }
    
    /**
     * @dev Gets payment history
     */
    function getPaymentHistory() external view returns (Payment[] memory) {
        return paymentHistory;
    }
    
    /**
     * @dev Gets lender information
     */
    function getLenderInfo(address lender) external view returns (uint256 contribution, uint256 expectedReturn) {
        contribution = lenderContributions[lender];
        if (totalFunded > 0) {
            expectedReturn = (totalRepaymentAmount * contribution) / totalFunded;
        }
    }
    
    /**
     * @dev Gets all lenders
     */
    function getLenders() external view returns (address[] memory) {
        return lenders;
    }
    
    /**
     * @dev Checks if payment is overdue
     */
    function isPaymentOverdue() external view returns (bool) {
        return status == LoanStatus.Active && block.timestamp > nextPaymentDue;
    }
    
    /**
     * @dev Gets funding progress percentage
     */
    function getFundingProgress() external view returns (uint256) {
        if (principal == 0) return 0;
        return (totalFunded * 100) / principal;
    }
}