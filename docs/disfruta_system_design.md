# Disfruta P2P Lending Platform - System Design Document

## Implementation Approach

The Disfruta platform adopts a hybrid architecture combining traditional web technologies with blockchain infrastructure to create a secure, scalable, and user-friendly peer-to-peer lending platform. The system leverages React.js for the frontend, Node.js for backend services, PostgreSQL for off-chain data storage, and Ethereum-compatible smart contracts for core lending operations.

### Key Architectural Decisions:

**1. Hybrid Data Storage Strategy**
- On-chain: Loan terms, funding status, repayment records, and public transaction data
- Off-chain: User profiles, KYC documents, credit scores, and sensitive personal information
- IPFS: Document storage and backup for regulatory compliance

**2. Microservices Architecture**
- Modular backend services for authentication, credit assessment, payment processing, and blockchain integration
- API Gateway for unified service access and rate limiting
- Event-driven communication between services using message queues

**3. Progressive Web App (PWA) Design**
- React.js with TypeScript for type safety and maintainability
- Tailwind CSS for responsive, utility-first styling
- Service workers for offline functionality and push notifications

**4. Smart Contract Factory Pattern**
- LoanFactory contract creates individual loan instances
- Upgradeable proxy pattern for contract improvements
- Multi-signature governance for critical operations

**5. Layer-2 Integration**
- Primary deployment on Ethereum mainnet
- Polygon integration for cost-effective transactions
- Cross-chain bridge for asset movement

## Data Structures and Interfaces

### Frontend Architecture

```typescript
// Core Application Structure
interface User {
  id: string;
  email: string;
  profile: UserProfile;
  walletAddress?: string;
  kycStatus: KYCStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  address: Address;
  phoneNumber: string;
  employmentInfo: EmploymentInfo;
  creditScore?: number;
}

interface Loan {
  id: string;
  borrowerId: string;
  amount: number;
  interestRate: number;
  term: number; // months
  purpose: LoanPurpose;
  status: LoanStatus;
  riskGrade: RiskGrade;
  contractAddress?: string;
  fundingGoal: number;
  currentFunding: number;
  createdAt: Date;
  fundingDeadline: Date;
}

interface Investment {
  id: string;
  lenderId: string;
  loanId: string;
  amount: number;
  expectedReturn: number;
  status: InvestmentStatus;
  transactionHash?: string;
  createdAt: Date;
}

interface CreditAssessment {
  userId: string;
  creditScore: number;
  riskGrade: RiskGrade;
  factors: CreditFactor[];
  assessmentDate: Date;
  expiryDate: Date;
}

// React Components Structure
class App extends React.Component {
  render(): JSX.Element;
}

class HomePage extends React.Component {
  +displayStats(): void;
  +handleUserTypeSelection(type: UserType): void;
  render(): JSX.Element;
}

class AuthenticationPage extends React.Component {
  +handleLogin(credentials: LoginCredentials): Promise<void>;
  +handleSignup(userData: SignupData): Promise<void>;
  +handleMFAVerification(code: string): Promise<void>;
  render(): JSX.Element;
}

class BorrowerDashboard extends React.Component {
  +loadUserLoans(): Promise<Loan[]>;
  +submitLoanApplication(application: LoanApplication): Promise<void>;
  +makePayment(loanId: string, amount: number): Promise<void>;
  render(): JSX.Element;
}

class LenderDashboard extends React.Component {
  +loadAvailableLoans(): Promise<Loan[]>;
  +investInLoan(loanId: string, amount: number): Promise<void>;
  +configureAutoInvest(criteria: AutoInvestCriteria): Promise<void>;
  +loadPortfolioAnalytics(): Promise<PortfolioAnalytics>;
  render(): JSX.Element;
}
```

### Backend API Architecture

```typescript
// Authentication Service
class AuthService {
  +register(userData: UserRegistrationData): Promise<User>;
  +login(credentials: LoginCredentials): Promise<AuthToken>;
  +verifyMFA(userId: string, code: string): Promise<boolean>;
  +refreshToken(refreshToken: string): Promise<AuthToken>;
  +logout(userId: string): Promise<void>;
}

// Credit Assessment Service
class CreditService {
  +assessCreditworthiness(userId: string): Promise<CreditAssessment>;
  +updateCreditScore(userId: string): Promise<number>;
  +analyzeAlternativeData(bankData: BankTransactionData[]): Promise<CreditFactors>;
  +generateRiskGrade(creditScore: number, factors: CreditFactor[]): Promise<RiskGrade>;
}

// Loan Management Service
class LoanService {
  +createLoanApplication(application: LoanApplication): Promise<Loan>;
  +approveLoan(loanId: string): Promise<void>;
  +deployLoanContract(loan: Loan): Promise<string>;
  +fundLoan(loanId: string, funderId: string, amount: number): Promise<Investment>;
  +processRepayment(loanId: string, amount: number): Promise<void>;
  +handleDefault(loanId: string): Promise<void>;
}

// Blockchain Integration Service
class BlockchainService {
  +deployContract(contractData: ContractDeploymentData): Promise<string>;
  +executeTransaction(transaction: TransactionData): Promise<string>;
  +listenToEvents(contractAddress: string, eventName: string): void;
  +getContractState(contractAddress: string): Promise<ContractState>;
  +estimateGas(transaction: TransactionData): Promise<number>;
}

// Payment Processing Service
class PaymentService {
  +processPayment(paymentData: PaymentData): Promise<PaymentResult>;
  +setupRecurringPayment(loanId: string, schedule: PaymentSchedule): Promise<void>;
  +refundPayment(paymentId: string): Promise<void>;
  +generateInvoice(loanId: string, amount: number): Promise<Invoice>;
}
```

### Smart Contract Architecture

```solidity
// Core Smart Contracts
contract LoanFactory {
    struct LoanData {
        address borrower;
        uint256 amount;
        uint256 interestRate;
        uint256 term;
        uint256 createdAt;
        LoanStatus status;
    }
    
    mapping(uint256 => address) public loans;
    uint256 public loanCounter;
    
    function createLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _term,
        bytes32 _riskGrade
    ) external returns (address);
    
    function approveLoan(uint256 _loanId) external onlyAdmin;
    function pauseLoan(uint256 _loanId) external onlyAdmin;
}

contract Loan {
    struct LoanTerms {
        address borrower;
        uint256 principal;
        uint256 interestRate;
        uint256 term;
        uint256 monthlyPayment;
        uint256 totalRepayment;
    }
    
    struct FundingInfo {
        uint256 fundingGoal;
        uint256 currentFunding;
        uint256 fundingDeadline;
        mapping(address => uint256) lenderInvestments;
        address[] lenders;
    }
    
    LoanTerms public terms;
    FundingInfo public funding;
    LoanStatus public status;
    
    function fundLoan() external payable;
    function withdrawFunds() external onlyBorrower;
    function makeRepayment() external payable;
    function distributeFunds(uint256 amount) internal;
    function handleDefault() external;
}

contract LendingPool {
    mapping(address => uint256) public lenderBalances;
    mapping(address => Investment[]) public lenderInvestments;
    
    struct Investment {
        address loanContract;
        uint256 amount;
        uint256 expectedReturn;
        uint256 timestamp;
    }
    
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function autoInvest(AutoInvestCriteria memory criteria) external;
    function claimReturns(address loanContract) external;
}

contract InterestCalculator {
    function calculateMonthlyPayment(
        uint256 principal,
        uint256 annualRate,
        uint256 termMonths
    ) external pure returns (uint256);
    
    function calculateInterestDistribution(
        uint256 interestPayment,
        address[] memory lenders,
        uint256[] memory investments
    ) external pure returns (uint256[] memory);
}

contract UserRegistry {
    struct UserData {
        bool isVerified;
        bytes32 kycHash;
        uint256 registrationDate;
        UserRole role;
    }
    
    mapping(address => UserData) public users;
    
    function registerUser(bytes32 _kycHash, UserRole _role) external;
    function verifyUser(address _user) external onlyAdmin;
    function updateKYC(bytes32 _newKycHash) external;
}

contract Treasury {
    mapping(address => uint256) public feesCollected;
    uint256 public totalFees;
    uint256 public reserveFund;
    
    function collectFee(uint256 amount, FeeType feeType) external;
    function distributeFees() external onlyGovernance;
    function fundReserve(uint256 amount) external;
    function useReserveForDefault(uint256 amount, address loanContract) external;
}
```

### Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    kyc_status VARCHAR(20) DEFAULT 'PENDING',
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE user_profiles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone_number VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    employment_status VARCHAR(50),
    annual_income DECIMAL(12, 2),
    credit_score INTEGER,
    PRIMARY KEY (user_id)
);

-- Loans Table
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID REFERENCES users(id) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL,
    term_months INTEGER NOT NULL,
    purpose VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING',
    risk_grade CHAR(2),
    contract_address VARCHAR(42),
    funding_goal DECIMAL(12, 2),
    current_funding DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    funding_deadline TIMESTAMP,
    approved_at TIMESTAMP,
    funded_at TIMESTAMP
);

-- Investments Table
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_id UUID REFERENCES users(id) NOT NULL,
    loan_id UUID REFERENCES loans(id) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    expected_return DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Assessments Table
CREATE TABLE credit_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    credit_score INTEGER NOT NULL,
    risk_grade CHAR(2) NOT NULL,
    assessment_factors JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    loan_id UUID REFERENCES loans(id),
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    blockchain_hash VARCHAR(66),
    gas_used INTEGER,
    gas_price DECIMAL(20, 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);
```

## Program Call Flow

The system implements complex interactions between frontend, backend services, and smart contracts. The flow covers user registration, loan application, funding, and repayment processes.

### Core User Journey Flows:

1. **User Registration and KYC Flow**
2. **Loan Application and Approval Flow** 
3. **Loan Funding and Investment Flow**
4. **Repayment and Interest Distribution Flow**
5. **Default Handling Flow**

## Security Architecture

### Smart Contract Security
- **Multi-signature governance** for critical operations
- **Time-locked upgrades** with 48-hour delay
- **Emergency pause functionality** for all contracts
- **Reentrancy guards** on all state-changing functions
- **Access control modifiers** with role-based permissions
- **Gas optimization** to prevent DOS attacks
- **Formal verification** for critical mathematical operations

### Application Security
- **JWT authentication** with refresh tokens
- **Multi-factor authentication** (SMS, email, TOTP)
- **HTTPS enforcement** with HSTS headers
- **Content Security Policy** to prevent XSS
- **Input validation** and sanitization
- **Rate limiting** on all API endpoints
- **SQL injection prevention** with parameterized queries
- **CORS configuration** for cross-origin requests

### Data Protection
- **AES-256 encryption** for sensitive data at rest
- **TLS 1.3** for data in transit
- **GDPR compliance** with data minimization
- **PII tokenization** for external service integration
- **Secure key management** using HSM or cloud KMS
- **Regular security audits** and penetration testing

## Integration Patterns

### Blockchain-Web Integration
- **Event listening** for smart contract state changes
- **Transaction monitoring** with retry mechanisms
- **Gas estimation** and optimization strategies
- **Wallet integration** supporting multiple providers
- **Layer-2 bridging** for cost optimization
- **Oracle integration** for external data feeds

### External Service Integration
- **Credit bureau APIs** for credit score retrieval
- **Banking APIs** for account verification
- **Payment processors** for fiat transactions
- **KYC/AML services** for identity verification
- **Email/SMS services** for notifications
- **Cloud storage** for document management

## Scalability Considerations

### Horizontal Scaling
- **Microservices architecture** with independent scaling
- **Load balancers** for traffic distribution
- **Database sharding** for user and transaction data
- **CDN integration** for static asset delivery
- **Caching layers** with Redis for session management

### Performance Optimization
- **Database indexing** on frequently queried fields
- **Connection pooling** for database efficiency
- **Async processing** for non-critical operations
- **Background jobs** for blockchain monitoring
- **API response caching** for static data

### Blockchain Scalability
- **Layer-2 solutions** (Polygon, Arbitrum) integration
- **Batch transactions** for gas optimization
- **State channels** for frequent micro-transactions
- **Off-chain computation** with on-chain verification

## Deployment Architecture

### Infrastructure Components
- **Kubernetes orchestration** for container management
- **Docker containerization** for all services
- **AWS/Google Cloud** infrastructure
- **CI/CD pipelines** with automated testing
- **Monitoring and alerting** with Prometheus/Grafana
- **Log aggregation** with ELK stack

### Environment Strategy
- **Development environment** with testnet integration
- **Staging environment** for end-to-end testing
- **Production environment** with mainnet deployment
- **Disaster recovery** with multi-region backup

### Smart Contract Deployment
- **Testnet deployment** for initial testing
- **Security audit** before mainnet deployment
- **Mainnet deployment** with multi-signature approval
- **Contract verification** on block explorers
- **Monitoring setup** for contract events

## Anything UNCLEAR

1. **Regulatory Compliance**: The specific regulatory requirements for P2P lending vary significantly across jurisdictions. The system design assumes US-based compliance but may need modifications for international markets.

2. **Oracle Integration**: The choice of oracle providers for credit data and market information needs clarification based on cost, reliability, and security requirements.

3. **Cross-Chain Strategy**: While the design includes Layer-2 integration, the timeline and priority for supporting additional blockchain networks needs clarification.

4. **Institutional Integration**: The specific requirements for institutional lender onboarding and compliance may require additional architecture components.

5. **Dispute Resolution**: The mechanism for handling disputes between borrowers and lenders in a decentralized context needs further specification.

6. **Data Retention Policies**: The duration and method for storing user data, especially after account closure, needs clarification for GDPR compliance.

7. **Governance Token Economics**: If implementing a governance token, the specific tokenomics, distribution mechanism, and voting processes need detailed specification.

8. **Insurance Integration**: The platform may need integration with insurance providers for loan protection, which would require additional architecture components.