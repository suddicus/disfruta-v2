import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG, CONTRACT_ADDRESSES } from '../utils/constants';

// Import contract ABIs
// import LoanFactoryABI from '../abis/LoanFactory.json' assert { type: 'json' };
// import LoanABI from '../abis/Loan.json' assert { type: 'json' };
// import UserRegistryABI from '../abis/UserRegistry.json' assert { type: 'json' };
// import CreditScoringABI from '../abis/CreditScoring.json' assert { type: 'json' };
// import LendingPoolABI from '../abis/LendingPool.json' assert { type: 'json' };
// import TreasuryABI from '../abis/Treasury.json' assert { type: 'json' };
import {
  LoanFactoryABI,
  UserRegistryABI,
  CreditScoringABI,
  LendingPoolABI,
  TreasuryABI,
  LoanABI,
} from '../abis';


class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
  }

  // Initialize the service
  async initialize() {
    try {
      if (typeof window.ethereum !== 'undefined') {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        await this.loadContracts();
        this.isInitialized = true;
        return true;
      }
      throw new Error('MetaMask not detected');
    } catch (error) {
      console.error('Blockchain service initialization failed:', error);
      throw error;
    }
  }
  
  // Load smart contracts
  async loadContracts() {
    try {
      const networkId = await this.getNetworkId();
      const addresses = CONTRACT_ADDRESSES[networkId] || CONTRACT_ADDRESSES.default;

      this.contracts = {
        loanFactory: new ethers.Contract(addresses.LoanFactory, LoanFactoryABI, this.provider),
        userRegistry: new ethers.Contract(addresses.UserRegistry, UserRegistryABI, this.provider),
        creditScoring: new ethers.Contract(addresses.CreditScoring, CreditScoringABI, this.provider),
        lendingPool: new ethers.Contract(addresses.LendingPool, LendingPoolABI, this.provider),
        treasury: new ethers.Contract(addresses.Treasury, TreasuryABI, this.provider),
      };
    } catch (error) {
      console.error('Failed to load contracts:', error);
      throw error;
    }
  }

  // Wallet connection methods
  async connectWallet() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.signer = this.provider.getSigner();
      const account = await this.signer.getAddress();
      const balance = await this.provider.getBalance(account);
      const networkId = await this.getNetworkId();

      // Connect contracts with signer
      Object.keys(this.contracts).forEach(key => {
        this.contracts[key] = this.contracts[key].connect(this.signer);
      });

      return {
        account,
        balance: ethers.utils.formatEther(balance),
        networkId,
      };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }

  async disconnectWallet() {
    this.signer = null;
    // Reconnect contracts with provider only
    await this.loadContracts();
  }

  async getNetworkId() {
    const network = await this.provider.getNetwork();
    return network.chainId;
  }

  async getBalance(address) {
    const balance = await this.provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }

  async checkConnection() {
    if (typeof window.ethereum === 'undefined') {
      return false;
    }
  
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      return false;
    }
  }
  

  // User Registry methods
  async registerUser(userData) {
    try {
      const { name, email, userType, kycHash } = userData;
      const tx = await this.contracts.userRegistry.registerUser(
        name,
        email,
        userType === 'borrower' ? 1 : userType === 'lender' ? 2 : 3,
        kycHash
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('User registration failed:', error);
      throw error;
    }
  }

  async getUserInfo(address) {
    try {
      const userInfo = await this.contracts.userRegistry.getUser(address);
      return {
        name: userInfo.name,
        email: userInfo.email,
        userType: userInfo.userType,
        isVerified: userInfo.isVerified,
        creditScore: userInfo.creditScore.toNumber(),
        registrationDate: new Date(userInfo.registrationDate.toNumber() * 1000),
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      throw error;
    }
  }

  // Loan Factory methods
  async createLoan(loanData) {
    try {
      const {
        principal,
        interestRate,
        termInMonths,
        purpose,
        collateralAmount = 0,
        fundingDeadline
      } = loanData;

      const tx = await this.contracts.loanFactory.createLoan(
        ethers.utils.parseEther(principal.toString()),
        interestRate * 100, // Convert to basis points
        termInMonths,
        purpose,
        ethers.utils.parseEther(collateralAmount.toString()),
        Math.floor(new Date(fundingDeadline).getTime() / 1000)
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'LoanCreated');
      const loanAddress = event.args.loanAddress;
      
      return { txHash: tx.hash, loanAddress };
    } catch (error) {
      console.error('Loan creation failed:', error);
      throw error;
    }
  }

  async getBorrowerLoans(borrowerAddress) {
    try {
      const loanCount = await this.contracts.loanFactory.getBorrowerLoanCount(borrowerAddress);
      const loans = [];

      for (let i = 0; i < loanCount.toNumber(); i++) {
        const loanAddress = await this.contracts.loanFactory.getBorrowerLoan(borrowerAddress, i);
        const loanDetails = await this.getLoanDetails(loanAddress);
        loans.push({ address: loanAddress, ...loanDetails });
      }

      return loans;
    } catch (error) {
      console.error('Failed to get borrower loans:', error);
      throw error;
    }
  }

  async getAvailableLoans() {
    try {
      const totalLoans = await this.contracts.loanFactory.totalLoans();
      const loans = [];

      for (let i = 0; i < totalLoans.toNumber(); i++) {
        const loanAddress = await this.contracts.loanFactory.loans(i);
        const loanContract = new ethers.Contract(loanAddress, LoanABI, this.provider);
        const state = await loanContract.state();
        
        // Only include loans that are in funding state (1)
        if (state === 1) {
          const loanDetails = await this.getLoanDetails(loanAddress);
          loans.push({ address: loanAddress, ...loanDetails });
        }
      }

      return loans;
    } catch (error) {
      console.error('Failed to get available loans:', error);
      throw error;
    }
  }

  // Individual Loan methods
  async getLoanDetails(loanAddress) {
    try {
      const loanContract = new ethers.Contract(loanAddress, LoanABI, this.provider);
      
      const [
        borrower,
        principal,
        interestRate,
        termInMonths,
        purpose,
        state,
        totalFunded,
        fundingDeadline,
        collateralAmount
      ] = await Promise.all([
        loanContract.borrower(),
        loanContract.principal(),
        loanContract.interestRate(),
        loanContract.termInMonths(),
        loanContract.purpose(),
        loanContract.state(),
        loanContract.totalFunded(),
        loanContract.fundingDeadline(),
        loanContract.collateralAmount()
      ]);

      const fundingProgress = totalFunded.mul(100).div(principal).toNumber();
      const monthlyPayment = this.calculateMonthlyPayment(
        ethers.utils.formatEther(principal),
        interestRate.toNumber() / 10000,
        termInMonths.toNumber()
      );

      return {
        borrower,
        principal: parseFloat(ethers.utils.formatEther(principal)),
        interestRate: interestRate.toNumber() / 100,
        termInMonths: termInMonths.toNumber(),
        purpose,
        status: this.getLoanStatusString(state),
        totalFunded: parseFloat(ethers.utils.formatEther(totalFunded)),
        fundingProgress,
        fundingDeadline: new Date(fundingDeadline.toNumber() * 1000),
        collateralAmount: parseFloat(ethers.utils.formatEther(collateralAmount)),
        monthlyPayment,
      };
    } catch (error) {
      console.error('Failed to get loan details:', error);
      throw error;
    }
  }

  async investInLoan(loanAddress, amount) {
    try {
      const loanContract = new ethers.Contract(loanAddress, LoanABI, this.signer);
      const tx = await loanContract.invest({
        value: ethers.utils.parseEther(amount.toString())
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Investment failed:', error);
      throw error;
    }
  }

  async withdrawLoanFunds(loanAddress) {
    try {
      const loanContract = new ethers.Contract(loanAddress, LoanABI, this.signer);
      const tx = await loanContract.withdrawFunds();
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Funds withdrawal failed:', error);
      throw error;
    }
  }

  async makePayment(loanAddress, amount) {
    try {
      const loanContract = new ethers.Contract(loanAddress, LoanABI, this.signer);
      const tx = await loanContract.makePayment({
        value: ethers.utils.parseEther(amount.toString())
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  async withdrawReturns(loanAddress) {
    try {
      const loanContract = new ethers.Contract(loanAddress, LoanABI, this.signer);
      const tx = await loanContract.withdrawReturns();
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Returns withdrawal failed:', error);
      throw error;
    }
  }

  // Lender Investment tracking
  async getLenderInvestments(lenderAddress) {
    try {
      const investments = [];
      const totalLoans = await this.contracts.loanFactory.totalLoans();

      for (let i = 0; i < totalLoans.toNumber(); i++) {
        const loanAddress = await this.contracts.loanFactory.loans(i);
        const loanContract = new ethers.Contract(loanAddress, LoanABI, this.provider);
        
        try {
          const investment = await loanContract.lenderInvestments(lenderAddress);
          if (investment.amount.gt(0)) {
            const loanDetails = await this.getLoanDetails(loanAddress);
            investments.push({
              loanAddress,
              amount: parseFloat(ethers.utils.formatEther(investment.amount)),
              returns: parseFloat(ethers.utils.formatEther(investment.returns)),
              ...loanDetails
            });
          }
        } catch (error) {
          // Skip loans where lender has no investment
          continue;
        }
      }

      return investments;
    } catch (error) {
      console.error('Failed to get lender investments:', error);
      throw error;
    }
  }

  // Credit Scoring methods
  async updateCreditScore(userAddress, newScore, factors) {
    try {
      const tx = await this.contracts.creditScoring.updateCreditScore(
        userAddress,
        newScore,
        factors
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Credit score update failed:', error);
      throw error;
    }
  }

  async getCreditScore(userAddress) {
    try {
      const scoreData = await this.contracts.creditScoring.getCreditScore(userAddress);
      return {
        score: scoreData.score.toNumber(),
        lastUpdated: new Date(scoreData.lastUpdated.toNumber() * 1000),
        factors: scoreData.factors
      };
    } catch (error) {
      console.error('Failed to get credit score:', error);
      throw error;
    }
  }

  // Utility methods
  getLoanStatusString(state) {
    const states = ['pending', 'funding', 'active', 'repaid', 'defaulted'];
    return states[state] || 'unknown';
  }

  calculateMonthlyPayment(principal, annualRate, termInMonths) {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return principal / termInMonths;
    
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
    const denominator = Math.pow(1 + monthlyRate, termInMonths) - 1;
    return numerator / denominator;
  }

  // Event listeners
  setupEventListeners(callback) {
    if (!this.contracts.loanFactory) return;

    this.contracts.loanFactory.on('LoanCreated', (borrower, loanAddress, principal, event) => {
      callback('LoanCreated', {
        borrower,
        loanAddress,
        principal: ethers.utils.formatEther(principal),
        txHash: event.transactionHash
      });
    });

    // Add more event listeners as needed
  }

  removeEventListeners() {
    if (this.contracts.loanFactory) {
      this.contracts.loanFactory.removeAllListeners();
    }
  }
}

export const blockchainService = new BlockchainService();