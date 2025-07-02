classDiagram
    %% Frontend React Components
    class App {
        <<React Component>>
        -state: AppState
        -authService: AuthService
        +componentDidMount(): void
        +handleAuthStateChange(user: User): void
        +render(): JSX.Element
    }

    class HomePage {
        <<React Component>>
        -statsService: StatsService
        +loadPlatformStats(): Promise~PlatformStats~
        +handleGetStarted(userType: UserType): void
        +render(): JSX.Element
    }

    class AuthenticationPage {
        <<React Component>>
        -authService: AuthService
        +handleLogin(credentials: LoginCredentials): Promise~void~
        +handleSignup(userData: SignupData): Promise~void~
        +handleMFAVerification(code: string): Promise~void~
        +handlePasswordReset(email: string): Promise~void~
        +render(): JSX.Element
    }

    class BorrowerDashboard {
        <<React Component>>
        -loanService: LoanService
        -paymentService: PaymentService
        +loadUserLoans(): Promise~Loan[]~
        +submitLoanApplication(application: LoanApplication): Promise~void~
        +makePayment(loanId: string, amount: number): Promise~void~
        +trackApplicationStatus(loanId: string): Promise~LoanStatus~
        +render(): JSX.Element
    }

    class LenderDashboard {
        <<React Component>>
        -investmentService: InvestmentService
        -portfolioService: PortfolioService
        +loadAvailableLoans(): Promise~Loan[]~
        +investInLoan(loanId: string, amount: number): Promise~void~
        +configureAutoInvest(criteria: AutoInvestCriteria): Promise~void~
        +loadPortfolioAnalytics(): Promise~PortfolioAnalytics~
        +render(): JSX.Element
    }

    class WalletConnector {
        <<React Component>>
        -web3Service: Web3Service
        +connectWallet(provider: WalletProvider): Promise~string~
        +disconnectWallet(): void
        +switchNetwork(chainId: number): Promise~void~
        +render(): JSX.Element
    }

    %% Backend Services
    class AuthService {
        <<Service>>
        -userRepository: UserRepository
        -jwtService: JWTService
        -mfaService: MFAService
        +register(userData: UserRegistrationData): Promise~User~
        +login(credentials: LoginCredentials): Promise~AuthToken~
        +verifyMFA(userId: string, code: string): Promise~boolean~
        +refreshToken(refreshToken: string): Promise~AuthToken~
        +logout(userId: string): Promise~void~
        +resetPassword(email: string): Promise~void~
    }

    class CreditService {
        <<Service>>
        -creditRepository: CreditRepository
        -mlModel: CreditMLModel
        -bureauAPI: CreditBureauAPI
        +assessCreditworthiness(userId: string): Promise~CreditAssessment~
        +updateCreditScore(userId: string): Promise~number~
        +analyzeAlternativeData(bankData: BankTransactionData[]): Promise~CreditFactors~
        +generateRiskGrade(creditScore: number, factors: CreditFactor[]): Promise~RiskGrade~
        +scheduleCreditUpdate(userId: string): void
    }

    class LoanService {
        <<Service>>
        -loanRepository: LoanRepository
        -blockchainService: BlockchainService
        -creditService: CreditService
        +createLoanApplication(application: LoanApplication): Promise~Loan~
        +approveLoan(loanId: string): Promise~void~
        +deployLoanContract(loan: Loan): Promise~string~
        +fundLoan(loanId: string, funderId: string, amount: number): Promise~Investment~
        +processRepayment(loanId: string, amount: number): Promise~void~
        +handleDefault(loanId: string): Promise~void~
        +calculateLoanTerms(amount: number, riskGrade: RiskGrade): LoanTerms
    }

    class InvestmentService {
        <<Service>>
        -investmentRepository: InvestmentRepository
        -blockchainService: BlockchainService
        -portfolioService: PortfolioService
        +createInvestment(loanId: string, amount: number, userId: string): Promise~Investment~
        +executeAutoInvestment(criteria: AutoInvestCriteria): Promise~Investment[]~
        +liquidateInvestment(investmentId: string): Promise~void~
        +calculateExpectedReturns(loanId: string, amount: number): Promise~number~
        +getInvestmentHistory(userId: string): Promise~Investment[]~
    }

    class BlockchainService {
        <<Service>>
        -web3Provider: Web3Provider
        -contractFactory: ContractFactory
        -eventListener: EventListener
        +deployContract(contractData: ContractDeploymentData): Promise~string~
        +executeTransaction(transaction: TransactionData): Promise~string~
        +listenToEvents(contractAddress: string, eventName: string): void
        +getContractState(contractAddress: string): Promise~ContractState~
        +estimateGas(transaction: TransactionData): Promise~number~
        +batchTransactions(transactions: TransactionData[]): Promise~string[]~
    }

    class PaymentService {
        <<Service>>
        -paymentRepository: PaymentRepository
        -paymentGateway: PaymentGateway
        -blockchainService: BlockchainService
        +processPayment(paymentData: PaymentData): Promise~PaymentResult~
        +setupRecurringPayment(loanId: string, schedule: PaymentSchedule): Promise~void~
        +refundPayment(paymentId: string): Promise~void~
        +generateInvoice(loanId: string, amount: number): Promise~Invoice~
        +handleFailedPayment(paymentId: string): Promise~void~
    }

    class NotificationService {
        <<Service>>
        -emailService: EmailService
        -smsService: SMSService
        -pushService: PushService
        +sendLoanApprovalNotification(userId: string, loanId: string): Promise~void~
        +sendPaymentReminder(userId: string, loanId: string, daysUntilDue: number): Promise~void~
        +sendInvestmentOpportunity(userId: string, loanId: string): Promise~void~
        +sendDefaultNotification(userIds: string[], loanId: string): Promise~void~
    }

    %% Smart Contracts
    class LoanFactory {
        <<Smart Contract>>
        +loanCounter: uint256
        +loans: mapping~uint256 => address~
        +adminRole: bytes32
        +createLoan(amount: uint256, interestRate: uint256, term: uint256, riskGrade: bytes32): address
        +approveLoan(loanId: uint256): void
        +pauseLoan(loanId: uint256): void
        +getLoanAddress(loanId: uint256): address
        +getTotalLoans(): uint256
    }

    class Loan {
        <<Smart Contract>>
        +borrower: address
        +principal: uint256
        +interestRate: uint256
        +term: uint256
        +monthlyPayment: uint256
        +currentBalance: uint256
        +fundingGoal: uint256
        +currentFunding: uint256
        +status: LoanStatus
        +lenders: address[]
        +lenderInvestments: mapping~address => uint256~
        +fundLoan(): void
        +withdrawFunds(): void
        +makeRepayment(): void
        +distributeFunds(amount: uint256): void
        +handleDefault(): void
        +calculateRemainingBalance(): uint256
    }

    class LendingPool {
        <<Smart Contract>>
        +lenderBalances: mapping~address => uint256~
        +totalPoolBalance: uint256
        +autoInvestConfigs: mapping~address => AutoInvestConfig~
        +deposit(): void
        +withdraw(amount: uint256): void
        +autoInvest(criteria: AutoInvestCriteria): void
        +claimReturns(loanContract: address): void
        +getPoolStats(): PoolStats
    }

    class InterestCalculator {
        <<Smart Contract>>
        +calculateMonthlyPayment(principal: uint256, annualRate: uint256, termMonths: uint256): uint256
        +calculateInterestDistribution(interestPayment: uint256, lenders: address[], investments: uint256[]): uint256[]
        +calculateEarlyPaymentSavings(remainingBalance: uint256, remainingTerms: uint256, interestRate: uint256): uint256
        +calculateDefaultLoss(principal: uint256, paidAmount: uint256): uint256
    }

    class UserRegistry {
        <<Smart Contract>>
        +users: mapping~address => UserData~
        +verifiedUsers: mapping~address => bool~
        +adminRole: bytes32
        +registerUser(kycHash: bytes32, role: UserRole): void
        +verifyUser(user: address): void
        +updateKYC(newKycHash: bytes32): void
        +isUserVerified(user: address): bool
        +getUserRole(user: address): UserRole
    }

    class Treasury {
        <<Smart Contract>>
        +feesCollected: mapping~address => uint256~
        +totalFees: uint256
        +reserveFund: uint256
        +governanceToken: address
        +collectFee(amount: uint256, feeType: FeeType): void
        +distributeFees(): void
        +fundReserve(amount: uint256): void
        +useReserveForDefault(amount: uint256, loanContract: address): void
        +getReserveFundRatio(): uint256
    }

    class GovernanceToken {
        <<Smart Contract ERC20>>
        +totalSupply: uint256
        +balances: mapping~address => uint256~
        +votingPower: mapping~address => uint256~
        +proposals: mapping~uint256 => Proposal~
        +mint(to: address, amount: uint256): void
        +vote(proposalId: uint256, support: bool): void
        +createProposal(description: string, targets: address[], callData: bytes[]): uint256
        +executeProposal(proposalId: uint256): void
    }

    %% Data Models
    class User {
        <<Entity>>
        +id: string
        +email: string
        +passwordHash: string
        +walletAddress: string
        +kycStatus: KYCStatus
        +mfaEnabled: boolean
        +profile: UserProfile
        +createdAt: Date
        +updatedAt: Date
    }

    class UserProfile {
        <<Entity>>
        +userId: string
        +firstName: string
        +lastName: string
        +dateOfBirth: Date
        +phoneNumber: string
        +address: Address
        +employmentInfo: EmploymentInfo
        +creditScore: number
        +annualIncome: number
    }

    class Loan {
        <<Entity>>
        +id: string
        +borrowerId: string
        +amount: number
        +interestRate: number
        +term: number
        +purpose: LoanPurpose
        +status: LoanStatus
        +riskGrade: RiskGrade
        +contractAddress: string
        +fundingGoal: number
        +currentFunding: number
        +createdAt: Date
        +fundingDeadline: Date
    }

    class Investment {
        <<Entity>>
        +id: string
        +lenderId: string
        +loanId: string
        +amount: number
        +expectedReturn: number
        +status: InvestmentStatus
        +transactionHash: string
        +createdAt: Date
        +maturityDate: Date
    }

    class CreditAssessment {
        <<Entity>>
        +id: string
        +userId: string
        +creditScore: number
        +riskGrade: RiskGrade
        +factors: CreditFactor[]
        +assessmentDate: Date
        +expiryDate: Date
        +bureauData: BureauData
        +alternativeData: AlternativeData
    }

    class Transaction {
        <<Entity>>
        +id: string
        +userId: string
        +loanId: string
        +transactionType: TransactionType
        +amount: number
        +status: TransactionStatus
        +blockchainHash: string
        +gasUsed: number
        +gasPrice: number
        +createdAt: Date
        +confirmedAt: Date
    }

    %% Repositories
    class UserRepository {
        <<Repository>>
        +create(user: User): Promise~User~
        +findById(id: string): Promise~User~
        +findByEmail(email: string): Promise~User~
        +findByWalletAddress(address: string): Promise~User~
        +update(id: string, data: Partial~User~): Promise~User~
        +delete(id: string): Promise~void~
    }

    class LoanRepository {
        <<Repository>>
        +create(loan: Loan): Promise~Loan~
        +findById(id: string): Promise~Loan~
        +findByBorrowerId(borrowerId: string): Promise~Loan[]~
        +findAvailableLoans(filters: LoanFilters): Promise~Loan[]~
        +update(id: string, data: Partial~Loan~): Promise~Loan~
        +findOverdueLoans(): Promise~Loan[]~
    }

    class InvestmentRepository {
        <<Repository>>
        +create(investment: Investment): Promise~Investment~
        +findById(id: string): Promise~Investment~
        +findByLenderId(lenderId: string): Promise~Investment[]~
        +findByLoanId(loanId: string): Promise~Investment[]~
        +update(id: string, data: Partial~Investment~): Promise~Investment~
        +calculatePortfolioValue(lenderId: string): Promise~number~
    }

    %% Relationships
    App --> HomePage
    App --> AuthenticationPage
    App --> BorrowerDashboard
    App --> LenderDashboard
    App --> WalletConnector

    BorrowerDashboard --> LoanService
    BorrowerDashboard --> PaymentService
    LenderDashboard --> InvestmentService
    LenderDashboard --> PortfolioService

    AuthService --> UserRepository
    LoanService --> LoanRepository
    LoanService --> BlockchainService
    LoanService --> CreditService
    InvestmentService --> InvestmentRepository
    InvestmentService --> BlockchainService

    BlockchainService --> LoanFactory
    BlockchainService --> Loan
    BlockchainService --> LendingPool
    BlockchainService --> Treasury

    LoanFactory --> Loan
    Loan --> InterestCalculator
    LendingPool --> Loan
    Treasury --> GovernanceToken

    User --> UserProfile
    User --> CreditAssessment
    Loan --> Investment
    Investment --> Transaction

    UserRepository --> User
    LoanRepository --> Loan
    InvestmentRepository --> Investment
