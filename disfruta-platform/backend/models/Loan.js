const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Borrower is required']
  },
  amount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [100, 'Minimum loan amount is $100'],
    max: [1000000, 'Maximum loan amount is $1,000,000']
  },
  fundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  purpose: {
    type: String,
    required: [true, 'Loan purpose is required'],
    trim: true,
    minlength: [10, 'Purpose must be at least 10 characters'],
    maxlength: [500, 'Purpose cannot exceed 500 characters']
  },
  term: {
    type: Number,
    required: [true, 'Loan term is required'],
    min: [1, 'Minimum term is 1 month'],
    max: [60, 'Maximum term is 60 months']
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0.1, 'Minimum interest rate is 0.1%'],
    max: [50, 'Maximum interest rate is 50%']
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'funding', 'funded', 'active', 'completed', 'defaulted', 'rejected'],
    default: 'pending'
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    required: [true, 'Loan grade is required']
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: Date,
  fundingDeadline: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  startDate: Date,
  maturityDate: Date,
  monthlyPayment: {
    type: Number,
    default: 0
  },
  totalInterest: {
    type: Number,
    default: 0
  },
  totalRepayment: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingBalance: {
    type: Number,
    default: 0
  },
  nextPaymentDate: Date,
  paymentsCount: {
    type: Number,
    default: 0
  },
  missedPayments: {
    type: Number,
    default: 0
  },
  borrowerInfo: {
    employmentStatus: {
      type: String,
      enum: ['employed', 'self_employed', 'unemployed', 'retired', 'student'],
      required: true
    },
    annualIncome: {
      type: Number,
      required: true,
      min: 0
    },
    monthlyDebtPayments: {
      type: Number,
      default: 0,
      min: 0
    },
    homeOwnership: {
      type: String,
      enum: ['own', 'rent', 'mortgage', 'other'],
      required: true
    },
    yearsEmployed: {
      type: Number,
      min: 0,
      max: 50
    }
  },
  documents: [{
    type: {
      type: String,
      enum: ['income_verification', 'bank_statement', 'tax_return', 'employment_letter', 'other']
    },
    url: String,
    fileName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  riskAssessment: {
    debtToIncomeRatio: Number,
    creditUtilization: Number,
    paymentHistory: Number,
    lengthOfCreditHistory: Number,
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    }
  },
  blockchain: {
    contractAddress: String,
    transactionHash: String,
    blockNumber: Number,
    deploymentStatus: {
      type: String,
      enum: ['pending', 'deployed', 'failed'],
      default: 'pending'
    }
  },
  metadata: {
    ipfsHash: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
loanSchema.virtual('fundingProgress').get(function() {
  return this.amount > 0 ? (this.fundedAmount / this.amount) * 100 : 0;
});

loanSchema.virtual('isFullyFunded').get(function() {
  return this.fundedAmount >= this.amount;
});

loanSchema.virtual('daysRemaining').get(function() {
  if (!this.fundingDeadline) return 0;
  const now = new Date();
  const deadline = new Date(this.fundingDeadline);
  const diffTime = deadline - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

loanSchema.virtual('investments', {
  ref: 'Investment',
  localField: '_id',
  foreignField: 'loan'
});

// Indexes
loanSchema.index({ borrower: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ grade: 1 });
loanSchema.index({ applicationDate: -1 });
loanSchema.index({ fundingDeadline: 1 });
loanSchema.index({ interestRate: 1 });
loanSchema.index({ amount: 1 });

// Pre-save middleware
loanSchema.pre('save', function(next) {
  // Calculate loan metrics
  if (this.isModified('amount') || this.isModified('interestRate') || this.isModified('term')) {
    this.calculateLoanMetrics();
  }
  
  // Update remaining balance
  this.remainingBalance = this.totalRepayment - this.paidAmount;
  
  // Update metadata
  this.metadata.lastUpdated = new Date();
  
  next();
});

// Instance methods
loanSchema.methods.calculateLoanMetrics = function() {
  const principal = this.amount;
  const monthlyRate = this.interestRate / 100 / 12;
  const numPayments = this.term;
  
  if (monthlyRate === 0) {
    this.monthlyPayment = principal / numPayments;
    this.totalInterest = 0;
  } else {
    this.monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
    this.totalInterest = (this.monthlyPayment * numPayments) - principal;
  }
  
  this.totalRepayment = principal + this.totalInterest;
};

loanSchema.methods.updateFundingAmount = async function(amount) {
  this.fundedAmount += amount;
  
  if (this.fundedAmount >= this.amount) {
    this.status = 'funded';
    this.startDate = new Date();
    this.maturityDate = new Date();
    this.maturityDate.setMonth(this.maturityDate.getMonth() + this.term);
    this.nextPaymentDate = new Date();
    this.nextPaymentDate.setMonth(this.nextPaymentDate.getMonth() + 1);
  }
  
  return this.save();
};

loanSchema.methods.recordPayment = async function(amount, paymentDate = new Date()) {
  this.paidAmount += amount;
  this.paymentsCount += 1;
  this.remainingBalance = this.totalRepayment - this.paidAmount;
  
  // Update next payment date
  if (this.remainingBalance > 0) {
    this.nextPaymentDate = new Date(paymentDate);
    this.nextPaymentDate.setMonth(this.nextPaymentDate.getMonth() + 1);
  } else {
    this.status = 'completed';
    this.nextPaymentDate = null;
  }
  
  return this.save();
};

loanSchema.methods.markAsDefaulted = async function() {
  this.status = 'defaulted';
  
  // Update borrower statistics
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.borrower, {
    $inc: { 'statistics.defaultedLoans': 1 }
  });
  
  return this.save();
};

module.exports = mongoose.model('Loan', loanSchema);