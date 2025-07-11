sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant AUTH as Auth Service
    participant CREDIT as Credit Service
    participant LOAN as Loan Service
    participant BC as Blockchain Service
    participant SC as Smart Contract
    participant DB as Database
    participant PAY as Payment Service

    %% User Registration Flow
    Note over U,PAY: User Registration and KYC Process
    U->>FE: Access registration page
    FE->>API: POST /api/auth/register
    API->>AUTH: register(userData)
    AUTH->>DB: INSERT user record
    DB-->>AUTH: user created
    AUTH->>AUTH: sendVerificationEmail()
    AUTH-->>API: registration success
    API-->>FE: registration response
    FE-->>U: Show verification prompt
    
    U->>FE: Click verification link
    FE->>API: POST /api/auth/verify
    API->>AUTH: verifyEmail(token)
    AUTH->>DB: UPDATE user status
    AUTH-->>API: verification success
    API-->>FE: verification response
    FE-->>U: Account verified

    %% KYC Process
    U->>FE: Submit KYC documents
    FE->>API: POST /api/kyc/submit
    API->>AUTH: processKYC(documents)
    AUTH->>AUTH: validateDocuments()
    AUTH->>DB: UPDATE kyc_status
    AUTH-->>API: KYC processing
    API-->>FE: KYC submitted
    FE-->>U: KYC under review

    %% Borrower Loan Application Flow
    Note over U,PAY: Loan Application Process
    U->>FE: Access loan application
    FE->>API: GET /api/loans/application-form
    API-->>FE: form configuration
    FE-->>U: Display application form
    
    U->>FE: Submit loan application
    FE->>API: POST /api/loans/apply
    API->>LOAN: createLoanApplication(data)
    LOAN->>CREDIT: assessCreditworthiness(userId)
    CREDIT->>CREDIT: calculateCreditScore()
    CREDIT->>CREDIT: analyzeAlternativeData()
    CREDIT->>DB: INSERT credit_assessment
    CREDIT-->>LOAN: creditAssessment
    
    LOAN->>LOAN: calculateLoanTerms()
    LOAN->>DB: INSERT loan record
    DB-->>LOAN: loan created
    LOAN-->>API: loan application success
    API-->>FE: application submitted
    FE-->>U: Application under review

    %% Loan Approval Process
    Note over U,PAY: Loan Approval and Smart Contract Deployment
    LOAN->>LOAN: reviewApplication()
    LOAN->>API: POST /api/admin/approve-loan
    API->>LOAN: approveLoan(loanId)
    LOAN->>BC: deployLoanContract(loanData)
    BC->>SC: LoanFactory.createLoan(...)
    SC->>SC: deploy new Loan contract
    SC-->>BC: contract address
    BC-->>LOAN: deployment success
    
    LOAN->>DB: UPDATE loan status, contract_address
    LOAN->>FE: emit loanApproved event
    FE-->>U: Loan approved notification

    %% Lender Investment Flow
    Note over U,PAY: Investment and Funding Process
    U->>FE: Browse available loans
    FE->>API: GET /api/loans/available
    API->>LOAN: getAvailableLoans(filters)
    LOAN->>DB: SELECT approved loans
    DB-->>LOAN: loan list
    LOAN-->>API: available loans
    API-->>FE: loan data
    FE-->>U: Display loan opportunities
    
    U->>FE: Select loan to invest
    FE->>API: POST /api/investments/invest
    API->>LOAN: investInLoan(loanId, amount)
    LOAN->>BC: fundLoan(contractAddress, amount)
    BC->>SC: Loan.fundLoan() with ETH
    SC->>SC: update funding amount
    SC->>SC: emit FundingReceived event
    SC-->>BC: transaction hash
    BC-->>LOAN: funding success
    
    LOAN->>DB: INSERT investment record
    LOAN->>DB: UPDATE loan current_funding
    LOAN-->>API: investment success
    API-->>FE: investment confirmed
    FE-->>U: Investment successful

    %% Loan Funding Complete
    Note over U,PAY: Funding Goal Reached
    SC->>SC: checkFundingGoal()
    SC->>SC: emit LoanFullyFunded event
    BC->>LOAN: processFundingComplete()
    LOAN->>DB: UPDATE loan status to FUNDED
    LOAN->>PAY: initiateDisbursement(loanId)
    PAY->>SC: Loan.withdrawFunds()
    SC->>SC: transfer funds to borrower
    SC-->>PAY: disbursement complete
    PAY-->>LOAN: funds disbursed
    LOAN->>FE: emit loanDisbursed event
    FE-->>U: Funds available

    %% Repayment Flow
    Note over U,PAY: Monthly Repayment Process
    U->>FE: Make loan payment
    FE->>API: POST /api/loans/repay
    API->>PAY: processRepayment(loanId, amount)
    PAY->>BC: makeRepayment(contractAddress, amount)
    BC->>SC: Loan.makeRepayment() with payment
    SC->>SC: calculateInterestDistribution()
    SC->>SC: distributeFundsToLenders()
    SC->>SC: emit RepaymentProcessed event
    SC-->>BC: repayment success
    BC-->>PAY: transaction confirmed
    
    PAY->>DB: INSERT transaction record
    PAY->>LOAN: updateLoanBalance(loanId, amount)
    LOAN->>DB: UPDATE loan balance
    PAY-->>API: repayment success
    API-->>FE: payment confirmed
    FE-->>U: Payment successful

    %% Auto-Investment Flow
    Note over U,PAY: Automated Investment Process
    U->>FE: Configure auto-invest
    FE->>API: POST /api/investments/auto-invest
    API->>LOAN: setupAutoInvest(criteria)
    LOAN->>DB: INSERT auto_invest_config
    
    loop Daily Auto-Investment Check
        LOAN->>LOAN: checkAutoInvestCriteria()
        LOAN->>DB: SELECT matching loans
        LOAN->>BC: executeAutoInvestment()
        BC->>SC: LendingPool.autoInvest()
        SC-->>BC: investment executed
        BC-->>LOAN: auto-investment complete
        LOAN->>FE: emit autoInvestmentExecuted
        FE-->>U: Auto-investment notification
    end

    %% Default Handling Flow
    Note over U,PAY: Default and Recovery Process
    LOAN->>LOAN: checkOverduePayments()
    LOAN->>DB: SELECT overdue loans
    LOAN->>BC: handleDefault(contractAddress)
    BC->>SC: Loan.handleDefault()
    SC->>SC: liquidateCollateral()
    SC->>SC: useReserveFund()
    SC->>SC: distributeLosses()
    SC-->>BC: default processed
    BC-->>LOAN: default handling complete
    LOAN->>DB: UPDATE loan status to DEFAULTED
    LOAN->>FE: emit loanDefaulted event
    FE-->>U: Default notification

    %% Portfolio Analytics Flow
    Note over U,PAY: Lender Portfolio Management
    U->>FE: View portfolio dashboard
    FE->>API: GET /api/portfolio/analytics
    API->>LOAN: getPortfolioAnalytics(userId)
    LOAN->>DB: SELECT user investments
    LOAN->>BC: getContractStates(addresses[])
    BC->>SC: multiple contract calls
    SC-->>BC: contract states
    BC-->>LOAN: on-chain data
    LOAN->>LOAN: calculatePortfolioMetrics()
    LOAN-->>API: portfolio analytics
    API-->>FE: analytics data
    FE-->>U: Display portfolio dashboard
