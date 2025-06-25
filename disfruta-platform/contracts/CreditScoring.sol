// contracts/CreditScoring.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CreditScoring
 * @dev On-chain credit scoring and risk assessment system
 * @dev Manages credit scores, payment history, and risk evaluation
 */
contract CreditScoring is AccessControl, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CREDIT_ANALYST_ROLE = keccak256("CREDIT_ANALYST_ROLE");
    bytes32 public constant LOAN_REPORTER_ROLE = keccak256("LOAN_REPORTER_ROLE");
    
    // Credit score structure
    struct CreditProfile {
        uint256 creditScore;          // FICO-style score (300-850)
        uint256 totalLoans;           // Total number of loans taken
        uint256 activeLoans;          // Currently active loans
        uint256 totalBorrowed;        // Total amount borrowed (lifetime)
        uint256 totalRepaid;          // Total amount repaid
        uint256 onTimePayments;       // Number of on-time payments
        uint256 latePayments;         // Number of late payments
        uint256 defaultedLoans;       // Number of defaulted loans
        uint256 lastPaymentDate;      // Timestamp of last payment
        uint256 lastScoreUpdate;      // Timestamp of last score calculation
        bool hasDefaultHistory;       // Flag for default history
        uint256 longestCreditHistory; // Length of credit history in months
    }
    
    // Payment behavior tracking
    struct PaymentBehavior {
        uint256 averagePaymentDelay;  // Average days late on payments
        uint256 paymentConsistency;   // Consistency score (0-100)
        uint256 earlyPayments;        // Number of early payments
        uint256 partialPayments;      // Number of partial payments
        uint256 missedPayments;       // Number of completely missed payments
        uint256 paymentTrend;         // Recent payment trend (improving/declining)
    }
    
    // Risk assessment factors
    struct RiskFactors {
        uint256 debtToIncomeRatio;    // Debt-to-income ratio (basis points)
        uint256 utilizationRate;      // Credit utilization rate
        uint256 accountAge;           // Age of oldest credit account (months)
        uint256 creditMix;            // Diversity of credit types
        uint256 recentInquiries;      // Number of recent credit inquiries
        uint256 stabilityScore;       // Employment/income stability score
    }
    
    // Credit score ranges and risk levels
    enum RiskLevel {
        EXCELLENT,    // 750-850
        GOOD,         // 700-749
        FAIR,         // 650-699
        POOR,         // 600-649
        VERY_POOR     // 300-599
    }
    
    // State variables
    mapping(address => CreditProfile) public creditProfiles;
    mapping(address => PaymentBehavior) public paymentBehaviors;
    mapping(address => RiskFactors) public riskFactors;
    mapping(address => uint256[]) public scoreHistory; // Historical scores
    mapping(address => bool) public verifiedBorrowers;
    
    // Platform statistics
    uint256 public totalBorrowers;
    uint256 public averageCreditScore;
    uint256 public totalCreditAssessments;
    
    // Score calculation weights (in basis points)
    uint256 public constant PAYMENT_HISTORY_WEIGHT = 3500;      // 35%
    uint256 public constant CREDIT_UTILIZATION_WEIGHT = 3000;   // 30%
    uint256 public constant CREDIT_HISTORY_WEIGHT = 1500;       // 15%
    uint256 public constant CREDIT_MIX_WEIGHT = 1000;           // 10%
    uint256 public constant NEW_CREDIT_WEIGHT = 1000;           // 10%
    
    // Events
    event CreditScoreUpdated(
        address indexed borrower,
        uint256 oldScore,
        uint256 newScore,
        RiskLevel riskLevel,
        uint256 timestamp
    );
    
    event PaymentReported(
        address indexed borrower,
        address indexed loanContract,
        uint256 amount,
        bool onTime,
        uint256 daysLate,
        uint256 timestamp
    );
    
    event DefaultReported(
        address indexed borrower,
        address indexed loanContract,
        uint256 amount,
        uint256 timestamp
    );
    
    event CreditProfileCreated(
        address indexed borrower,
        uint256 initialScore,
        uint256 timestamp
    );
    
    event RiskAssessmentCompleted(
        address indexed borrower,
        RiskLevel riskLevel,
        uint256 recommendedRate,
        uint256 timestamp
    );
    
    // Custom errors
    error BorrowerNotFound();
    error InvalidScoreRange();
    error UnauthorizedReporter();
    error InvalidRiskFactors();
    error ScoreCalculationFailed();
    
    constructor() {
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CREDIT_ANALYST_ROLE, msg.sender);
        _grantRole(LOAN_REPORTER_ROLE, msg.sender);
    }
    
    /**
     * @dev Creates initial credit profile for new borrower
     * @param _borrower Address of the borrower
     * @param _initialData Initial credit data from external sources
     */
    function createCreditProfile(
        address _borrower,
        uint256[6] memory _initialData // [income, employment_months, existing_debt, payment_history_months, previous_defaults, credit_inquiries]
    ) external onlyRole(CREDIT_ANALYST_ROLE) whenNotPaused {
        require(_borrower != address(0), "Invalid borrower address");
        require(creditProfiles[_borrower].lastScoreUpdate == 0, "Profile already exists");
        
        // Calculate initial credit score based on provided data
        uint256 initialScore = _calculateInitialScore(_initialData);
        
        // Create credit profile
        creditProfiles[_borrower] = CreditProfile({
            creditScore: initialScore,
            totalLoans: 0,
            activeLoans: 0,
            totalBorrowed: 0,
            totalRepaid: 0,
            onTimePayments: 0,
            latePayments: 0,
            defaultedLoans: 0,
            lastPaymentDate: 0,
            lastScoreUpdate: block.timestamp,
            hasDefaultHistory: _initialData[4] > 0,
            longestCreditHistory: _initialData[3]
        });
        
        // Initialize payment behavior
        paymentBehaviors[_borrower] = PaymentBehavior({
            averagePaymentDelay: 0,
            paymentConsistency: 100, // Start with perfect consistency
            earlyPayments: 0,
            partialPayments: 0,
            missedPayments: _initialData[4],
            paymentTrend: 100 // Neutral trend
        });
        
        // Initialize risk factors
        riskFactors[_borrower] = RiskFactors({
            debtToIncomeRatio: _initialData[0] > 0 ? (_initialData[2] * 10000) / _initialData[0] : 0,
            utilizationRate: 0, // Will be updated with loan activity
            accountAge: _initialData[3],
            creditMix: 1, // Single type initially
            recentInquiries: _initialData[5],
            stabilityScore: _initialData[1] >= 24 ? 100 : (_initialData[1] * 100) / 24 // Employment stability
        });
        
        // Store initial score in history
        scoreHistory[_borrower].push(initialScore);
        verifiedBorrowers[_borrower] = true;
        totalBorrowers++;
        
        emit CreditProfileCreated(_borrower, initialScore, block.timestamp);
    }
    
    /**
     * @dev Reports a payment made by borrower
     * @param _borrower Address of the borrower
     * @param _loanContract Address of the loan contract
     * @param _amount Payment amount
     * @param _onTime Whether payment was made on time
     * @param _daysLate Number of days late (0 if on time)
     */
    function reportPayment(
        address _borrower,
        address _loanContract,
        uint256 _amount,
        bool _onTime,
        uint256 _daysLate
    ) external onlyRole(LOAN_REPORTER_ROLE) whenNotPaused {
        if (creditProfiles[_borrower].lastScoreUpdate == 0) {
            revert BorrowerNotFound();
        }
        
        CreditProfile storage profile = creditProfiles[_borrower];
        PaymentBehavior storage behavior = paymentBehaviors[_borrower];
        
        // Update payment statistics
        if (_onTime) {
            profile.onTimePayments++;
            if (_daysLate == 0) {
                behavior.earlyPayments++;
            }
        } else {
            profile.latePayments++;
            if (_daysLate > 0) {
                // Update average payment delay
                behavior.averagePaymentDelay = 
                    (behavior.averagePaymentDelay * profile.latePayments + _daysLate) / 
                    (profile.latePayments + 1);
            }
        }
        
        profile.lastPaymentDate = block.timestamp;
        
        // Update payment consistency score
        uint256 totalPayments = profile.onTimePayments + profile.latePayments;
        behavior.paymentConsistency = (profile.onTimePayments * 100) / totalPayments;
        
        // Recalculate credit score
        _updateCreditScore(_borrower);
        
        emit PaymentReported(_borrower, _loanContract, _amount, _onTime, _daysLate, block.timestamp);
    }
    
    /**
     * @dev Reports a loan default
     * @param _borrower Address of the borrower
     * @param _loanContract Address of the loan contract
     * @param _defaultAmount Amount in default
     */
    function reportDefault(
        address _borrower,
        address _loanContract,
        uint256 _defaultAmount
    ) external onlyRole(LOAN_REPORTER_ROLE) whenNotPaused {
        if (creditProfiles[_borrower].lastScoreUpdate == 0) {
            revert BorrowerNotFound();
        }
        
        CreditProfile storage profile = creditProfiles[_borrower];
        
        // Update default statistics
        profile.defaultedLoans++;
        profile.hasDefaultHistory = true;
        profile.activeLoans = profile.activeLoans > 0 ? profile.activeLoans - 1 : 0;
        
        // Severely impact credit score for defaults
        _applyDefaultPenalty(_borrower, _defaultAmount);
        
        emit DefaultReported(_borrower, _loanContract, _defaultAmount, block.timestamp);
    }
    
    /**
     * @dev Updates loan statistics when new loan is taken
     * @param _borrower Address of the borrower
     * @param _loanAmount Amount of the new loan
     */
    function reportNewLoan(
        address _borrower,
        uint256 _loanAmount
    ) external onlyRole(LOAN_REPORTER_ROLE) whenNotPaused {
        if (creditProfiles[_borrower].lastScoreUpdate == 0) {
            revert BorrowerNotFound();
        }
        
        CreditProfile storage profile = creditProfiles[_borrower];
        RiskFactors storage risk = riskFactors[_borrower];
        
        // Update loan statistics
        profile.totalLoans++;
        profile.activeLoans++;
        profile.totalBorrowed += _loanAmount;
        
        // Update utilization rate (assuming some credit limit calculation)
        // This is simplified - in practice would be more complex
        uint256 estimatedCreditLimit = _estimateCreditLimit(_borrower);
        if (estimatedCreditLimit > 0) {
            uint256 currentUtilization = (profile.totalBorrowed * 10000) / estimatedCreditLimit;
            risk.utilizationRate = currentUtilization > 10000 ? 10000 : currentUtilization;
        }
        
        // Recalculate credit score
        _updateCreditScore(_borrower);
    }
    
    /**
     * @dev Updates credit score based on current profile data
     * @param _borrower Address of the borrower
     */
    function _updateCreditScore(address _borrower) private {
        CreditProfile storage profile = creditProfiles[_borrower];
        PaymentBehavior storage behavior = paymentBehaviors[_borrower];
        RiskFactors storage risk = riskFactors[_borrower];
        
        uint256 oldScore = profile.creditScore;
        
        // Calculate component scores
        uint256 paymentScore = _calculatePaymentHistoryScore(_borrower);
        uint256 utilizationScore = _calculateUtilizationScore(risk.utilizationRate);
        uint256 historyScore = _calculateCreditHistoryScore(risk.accountAge);
        uint256 mixScore = _calculateCreditMixScore(risk.creditMix);
        uint256 inquiryScore = _calculateNewCreditScore(risk.recentInquiries);
        
        // Calculate weighted average
        uint256 newScore = (
            paymentScore * PAYMENT_HISTORY_WEIGHT +
            utilizationScore * CREDIT_UTILIZATION_WEIGHT +
            historyScore * CREDIT_HISTORY_WEIGHT +
            mixScore * CREDIT_MIX_WEIGHT +
            inquiryScore * NEW_CREDIT_WEIGHT
        ) / 10000;
        
        // Apply default penalty if applicable
        if (profile.hasDefaultHistory) {
            uint256 defaultPenalty = profile.defaultedLoans * 50; // 50 points per default
            newScore = newScore > defaultPenalty ? newScore - defaultPenalty : 300;
        }
        
        // Ensure score is within valid range
        if (newScore < 300) newScore = 300;
        if (newScore > 850) newScore = 850;
        
        // Update profile
        profile.creditScore = newScore;
        profile.lastScoreUpdate = block.timestamp;
        
        // Store in history
        scoreHistory[_borrower].push(newScore);
        
        // Update platform average
        _updatePlatformAverage();
        
        emit CreditScoreUpdated(_borrower, oldScore, newScore, _getRiskLevel(newScore), block.timestamp);
    }
    
    /**
     * @dev Calculates payment history component score
     */
    function _calculatePaymentHistoryScore(address _borrower) private view returns (uint256) {
        CreditProfile storage profile = creditProfiles[_borrower];
        PaymentBehavior storage behavior = paymentBehaviors[_borrower];
        
        if (profile.onTimePayments + profile.latePayments == 0) {
            return 750; // Default score for no history
        }
        
        uint256 totalPayments = profile.onTimePayments + profile.latePayments;
        uint256 onTimePercentage = (profile.onTimePayments * 100) / totalPayments;
        
        // Base score from on-time percentage
        uint256 baseScore = 300 + (onTimePercentage * 550) / 100; // Scale to 300-850
        
        // Adjust for payment delay severity
        if (behavior.averagePaymentDelay > 30) {
            baseScore = baseScore > 100 ? baseScore - 100 : 300;
        } else if (behavior.averagePaymentDelay > 15) {
            baseScore = baseScore > 50 ? baseScore - 50 : 300;
        }
        
        return baseScore;
    }
    
    /**
     * @dev Calculates utilization score
     */
    function _calculateUtilizationScore(uint256 utilizationRate) private pure returns (uint256) {
        if (utilizationRate == 0) return 850; // No utilization is excellent
        if (utilizationRate <= 1000) return 800; // Under 10% is very good
        if (utilizationRate <= 3000) return 750; // Under 30% is good
        if (utilizationRate <= 5000) return 650; // Under 50% is fair
        if (utilizationRate <= 7000) return 550; // Under 70% is poor
        return 400; // Over 70% is very poor
    }
    
    /**
     * @dev Calculates credit history length score
     */
    function _calculateCreditHistoryScore(uint256 accountAgeMonths) private pure returns (uint256) {
        if (accountAgeMonths >= 120) return 850; // 10+ years excellent
        if (accountAgeMonths >= 84) return 750;  // 7+ years good
        if (accountAgeMonths >= 60) return 650;  // 5+ years fair
        if (accountAgeMonths >= 36) return 550;  // 3+ years poor
        if (accountAgeMonths >= 12) return 450;  // 1+ year very poor
        return 350; // Less than 1 year
    }
    
    /**
     * @dev Calculates credit mix score
     */
    function _calculateCreditMixScore(uint256 creditMix) private pure returns (uint256) {
        if (creditMix >= 4) return 850; // Diverse mix
        if (creditMix >= 3) return 750; // Good mix
        if (creditMix >= 2) return 650; // Fair mix
        return 550; // Limited mix
    }
    
    /**
     * @dev Calculates new credit inquiries score
     */
    function _calculateNewCreditScore(uint256 recentInquiries) private pure returns (uint256) {
        if (recentInquiries == 0) return 850; // No recent inquiries
        if (recentInquiries <= 2) return 750; // Few inquiries
        if (recentInquiries <= 4) return 650; // Moderate inquiries
        if (recentInquiries <= 6) return 550; // Many inquiries
        return 400; // Too many inquiries
    }
    
    /**
     * @dev Calculates initial credit score from external data
     */
    function _calculateInitialScore(uint256[6] memory _data) private pure returns (uint256) {
        // Simplified initial scoring algorithm
        uint256 baseScore = 600; // Start with fair score
        
        // Adjust based on employment history
        if (_data[1] >= 24) baseScore += 50; // 2+ years employment
        else if (_data[1] >= 12) baseScore += 25; // 1+ year employment
        
        // Adjust based on debt-to-income ratio
        if (_data[0] > 0) {
            uint256 dtiRatio = (_data[2] * 100) / _data[0];
            if (dtiRatio <= 20) baseScore += 50; // Low DTI
            else if (dtiRatio <= 40) baseScore += 25; // Moderate DTI
            else if (dtiRatio >= 80) baseScore -= 50; // High DTI
        }
        
        // Adjust based on credit history length
        if (_data[3] >= 60) baseScore += 50; // Long history
        else if (_data[3] >= 24) baseScore += 25; // Moderate history
        
        // Penalty for previous defaults
        baseScore -= _data[4] * 75; // 75 points per default
        
        // Penalty for recent inquiries
        if (_data[5] > 6) baseScore -= 50;
        else if (_data[5] > 3) baseScore -= 25;
        
        // Ensure within valid range
        if (baseScore < 300) baseScore = 300;
        if (baseScore > 850) baseScore = 850;
        
        return baseScore;
    }
    
    /**
     * @dev Applies penalty for loan default
     */
    function _applyDefaultPenalty(address _borrower, uint256 _defaultAmount) private {
        CreditProfile storage profile = creditProfiles[_borrower];
        
        // Calculate penalty based on default amount and frequency
        uint256 basePenalty = 100; // Base 100 point penalty
        uint256 amountPenalty = _defaultAmount / (10000 * 10**18); // Additional penalty per $10k
        uint256 frequencyPenalty = profile.defaultedLoans * 25; // 25 points per additional default
        
        uint256 totalPenalty = basePenalty + amountPenalty + frequencyPenalty;
        
        // Apply penalty
        profile.creditScore = profile.creditScore > totalPenalty ? 
            profile.creditScore - totalPenalty : 300;
        
        // Ensure minimum score
        if (profile.creditScore < 300) {
            profile.creditScore = 300;
        }
    }
    
    /**
     * @dev Estimates credit limit for utilization calculation
     */
    function _estimateCreditLimit(address _borrower) private view returns (uint256) {
        CreditProfile storage profile = creditProfiles[_borrower];
        
        // Simplified estimation based on credit score and history
        uint256 baseLimit = 5000 * 10**18; // $5,000 base limit
        
        // Adjust based on credit score
        if (profile.creditScore >= 750) {
            baseLimit = baseLimit * 4; // $20,000 for excellent credit
        } else if (profile.creditScore >= 700) {
            baseLimit = baseLimit * 3; // $15,000 for good credit
        } else if (profile.creditScore >= 650) {
            baseLimit = baseLimit * 2; // $10,000 for fair credit
        }
        
        // Adjust based on payment history
        if (profile.onTimePayments > 24) {
            baseLimit = (baseLimit * 120) / 100; // 20% increase for good history
        }
        
        return baseLimit;
    }
    
    /**
     * @dev Updates platform average credit score
     */
    function _updatePlatformAverage() private {
        // This is a simplified calculation - in practice might use more sophisticated methods
        totalCreditAssessments++;
    }
    
    /**
     * @dev Gets risk level from credit score
     */
    function _getRiskLevel(uint256 _score) private pure returns (RiskLevel) {
        if (_score >= 750) return RiskLevel.EXCELLENT;
        if (_score >= 700) return RiskLevel.GOOD;
        if (_score >= 650) return RiskLevel.FAIR;
        if (_score >= 600) return RiskLevel.POOR;
        return RiskLevel.VERY_POOR;
    }
    
    // Public view functions
    
    /**
     * @dev Gets credit score for a borrower
     */
    function getCreditScore(address _borrower) external view returns (uint256) {
        return creditProfiles[_borrower].creditScore;
    }
    
    /**
     * @dev Gets complete credit profile
     */
    function getCreditProfile(address _borrower) 
        external 
        view 
        returns (CreditProfile memory) 
    {
        return creditProfiles[_borrower];
    }
    
    /**
     * @dev Gets payment behavior data
     */
    function getPaymentBehavior(address _borrower) 
        external 
        view 
        returns (PaymentBehavior memory) 
    {
        return paymentBehaviors[_borrower];
    }
    
    /**
     * @dev Gets risk factors
     */
    function getRiskFactors(address _borrower) 
        external 
        view 
        returns (RiskFactors memory) 
    {
        return riskFactors[_borrower];
    }
    
    /**
     * @dev Gets risk level for borrower
     */
    function getRiskLevel(address _borrower) external view returns (RiskLevel) {
        return _getRiskLevel(creditProfiles[_borrower].creditScore);
    }
    
    /**
     * @dev Gets credit score history
     */
    function getScoreHistory(address _borrower) external view returns (uint256[] memory) {
        return scoreHistory[_borrower];
    }
    
    /**
     * @dev Checks if borrower is verified
     */
    function isVerifiedBorrower(address _borrower) external view returns (bool) {
        return verifiedBorrowers[_borrower];
    }
    
    /**
     * @dev Gets recommended interest rate based on credit score
     */
    function getRecommendedRate(address _borrower) public view returns (uint256) {
        uint256 score = creditProfiles[_borrower].creditScore;
        
        // Base rates in basis points (10000 = 100%)
        if (score >= 750) return 800;   // 8% for excellent credit
        if (score >= 700) return 1200;  // 12% for good credit
        if (score >= 650) return 1600;  // 16% for fair credit
        if (score >= 600) return 2000;  // 20% for poor credit
        return 2500; // 25% for very poor credit
    }
    
    /**
     * @dev Performs comprehensive risk assessment
     */
    function performRiskAssessment(address _borrower) 
        external 
        view 
        returns (
            RiskLevel riskLevel,
            uint256 recommendedRate,
            uint256 maxLoanAmount,
            bool approved
        ) 
    {
        CreditProfile storage profile = creditProfiles[_borrower];
        
        if (!verifiedBorrowers[_borrower]) {
            return (RiskLevel.VERY_POOR, 0, 0, false);
        }
        
        riskLevel = _getRiskLevel(profile.creditScore);
        recommendedRate = getRecommendedRate(_borrower);
        
        // Calculate max loan amount based on credit score and history
        if (profile.creditScore >= 700 && !profile.hasDefaultHistory) {
            maxLoanAmount = 50000 * 10**18; // $50,000 max
        } else if (profile.creditScore >= 650) {
            maxLoanAmount = 25000 * 10**18; // $25,000 max
        } else if (profile.creditScore >= 600) {
            maxLoanAmount = 10000 * 10**18; // $10,000 max
        } else {
            maxLoanAmount = 5000 * 10**18;  // $5,000 max
        }
        
        // Approval logic
        approved = profile.creditScore >= 550 && 
                  profile.activeLoans <= 3 && 
                  !_hasRecentDefaults(_borrower);
    }
    
    /**
     * @dev Checks for recent defaults (within last 12 months)
     */
    function _hasRecentDefaults(address _borrower) private view returns (bool) {
        // Simplified - in practice would check timestamp of defaults
        return creditProfiles[_borrower].defaultedLoans > 0;
    }
    
    /**
     * @dev Admin function to pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Admin function to unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}