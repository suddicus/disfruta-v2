// Blockchain network configurations
export const BLOCKCHAIN_CONFIG = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  ETHEREUM_GOERLI: {
    chainId: 5,
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://goerli.etherscan.io',
    nativeCurrency: {
      name: 'Goerli Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  POLYGON_MAINNET: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  POLYGON_MUMBAI: {
    chainId: 80001,
    name: 'Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18
    }
  }
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  1: { // Ethereum Mainnet
    LoanFactory: '0x0000000000000000000000000000000000000000',
    UserRegistry: '0x0000000000000000000000000000000000000000',
    CreditScoring: '0x0000000000000000000000000000000000000000',
    LendingPool: '0x0000000000000000000000000000000000000000',
    Treasury: '0x0000000000000000000000000000000000000000'
  },
  5: { // Goerli Testnet
    LoanFactory: '0x0000000000000000000000000000000000000000',
    UserRegistry: '0x0000000000000000000000000000000000000000',
    CreditScoring: '0x0000000000000000000000000000000000000000',
    LendingPool: '0x0000000000000000000000000000000000000000',
    Treasury: '0x0000000000000000000000000000000000000000'
  },
  11155111: { // Sepolia Testnet
    LoanFactory: '0x0000000000000000000000000000000000000000',
    UserRegistry: '0x0000000000000000000000000000000000000000',
    CreditScoring: '0x0000000000000000000000000000000000000000',
    LendingPool: '0x0000000000000000000000000000000000000000',
    Treasury: '0x0000000000000000000000000000000000000000'
  },
  137: { // Polygon Mainnet
    LoanFactory: '0x0000000000000000000000000000000000000000',
    UserRegistry: '0x0000000000000000000000000000000000000000',
    CreditScoring: '0x0000000000000000000000000000000000000000',
    LendingPool: '0x0000000000000000000000000000000000000000',
    Treasury: '0x0000000000000000000000000000000000000000'
  },
  80001: { // Mumbai Testnet
    LoanFactory: '0x0000000000000000000000000000000000000000',
    UserRegistry: '0x0000000000000000000000000000000000000000',
    CreditScoring: '0x0000000000000000000000000000000000000000',
    LendingPool: '0x0000000000000000000000000000000000000000',
    Treasury: '0x0000000000000000000000000000000000000000'
  },
  default: { // Fallback addresses
    LoanFactory: '0x0000000000000000000000000000000000000000',
    UserRegistry: '0x0000000000000000000000000000000000000000',
    CreditScoring: '0x0000000000000000000000000000000000000000',
    LendingPool: '0x0000000000000000000000000000000000000000',
    Treasury: '0x0000000000000000000000000000000000000000'
  }
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },
  USERS: {
    PROFILE: '/users',
    KYC: '/users/:id/kyc',
    STATS: '/users/:id/stats',
    LOANS: '/users/:id/loans',
    INVESTMENTS: '/users/:id/investments'
  },
  LOANS: {
    CREATE: '/loans',
    LIST: '/loans',
    DETAILS: '/loans/:id',
    AVAILABLE: '/loans/available',
    STATUS: '/loans/:id/status'
  },
  INVESTMENTS: {
    CREATE: '/investments',
    LIST: '/investments',
    DETAILS: '/investments/:id'
  }
};

// Application constants
export const APP_CONFIG = {
  NAME: 'Disfruta',
  VERSION: '1.0.0',
  DESCRIPTION: 'Peer-to-Peer Lending Platform',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_FILE_TYPES: ['.pdf', '.jpg', '.jpeg', '.png'],
  DEFAULT_LOAN_TERMS: [6, 12, 18, 24, 36, 48, 60],
  MIN_LOAN_AMOUNT: 100,
  MAX_LOAN_AMOUNT: 100000,
  MIN_INTEREST_RATE: 5,
  MAX_INTEREST_RATE: 35
};

// User types
export const USER_TYPES = {
  BORROWER: 'borrower',
  LENDER: 'lender',
  BOTH: 'both'
};

// Loan statuses
export const LOAN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  FUNDING: 'funding',
  ACTIVE: 'active',
  REPAID: 'repaid',
  DEFAULTED: 'defaulted',
  REJECTED: 'rejected'
};

// Risk levels
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Credit score ranges
export const CREDIT_SCORE_RANGES = {
  EXCELLENT: { min: 750, max: 850, label: 'Excellent' },
  GOOD: { min: 700, max: 749, label: 'Good' },
  FAIR: { min: 650, max: 699, label: 'Fair' },
  POOR: { min: 600, max: 649, label: 'Poor' },
  VERY_POOR: { min: 300, max: 599, label: 'Very Poor' }
};

// Loan purposes
export const LOAN_PURPOSES = [
  'Business expansion',
  'Debt consolidation',
  'Home improvement',
  'Education',
  'Medical expenses',
  'Wedding',
  'Travel',
  'Emergency fund',
  'Investment',
  'Other'
];

// KYC document types
export const KYC_DOCUMENT_TYPES = [
  'passport',
  'driving_license',
  'national_id',
  'utility_bill',
  'bank_statement',
  'income_proof'
];

// Notification types
export const NOTIFICATION_TYPES = {
  LOAN_APPROVED: 'loan_approved',
  LOAN_REJECTED: 'loan_rejected',
  LOAN_FUNDED: 'loan_funded',
  PAYMENT_DUE: 'payment_due',
  PAYMENT_RECEIVED: 'payment_received',
  INVESTMENT_RETURN: 'investment_return',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected'
};

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_INPUT: 'Please check your input and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  TRANSACTION_SUBMITTED: 'Transaction submitted successfully',
  LOAN_CREATED: 'Loan application submitted successfully',
  INVESTMENT_MADE: 'Investment made successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  KYC_SUBMITTED: 'KYC documents submitted successfully'
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  WALLET_ADDRESS: 'wallet_address',
  NETWORK_ID: 'network_id',
  THEME: 'theme_preference'
};

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  WITH_TIME: 'MM/DD/YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

// Currency formats
export const CURRENCY_CONFIG = {
  USD: {
    symbol: '$',
    code: 'USD',
    decimals: 2
  },
  ETH: {
    symbol: 'Ξ',
    code: 'ETH',
    decimals: 4
  }
};

// Platform fees
export const PLATFORM_FEES = {
  LOAN_ORIGINATION: 0.01, // 1%
  LENDER_SERVICE: 0.005,  // 0.5%
  LATE_PAYMENT: 0.05,     // 5%
  DEFAULT_PROCESSING: 0.1  // 10%
};

// Regular expressions for validation
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  WALLET_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};