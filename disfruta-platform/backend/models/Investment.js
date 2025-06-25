const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  investor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Investor is required']
  },
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan is required']
  },
  amount: {
    type: Number,
    required: [true, 'Investment amount is required'],
    min: [25, 'Minimum investment amount is $25']
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'defaulted', 'cancelled'],
    default: 'pending'
  },
  investmentDate: {
    type: Date,
    default: Date.now
  },
  expectedReturn: {
    type: Number,
    default: 0
  },
  actualReturn: {
    type: Number,
    default: 0
  },
  interestEarned: {
    type: Number,
    default: 0
  },
  principalReceived: {
    type: Number,
    default: 0
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  monthlyReturn: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  lastPaymentDate: Date,
  nextPaymentDate: Date,
  paymentsReceived: {
    type: Number,
    default: 0
  },
  expectedPayments: {
    type: Number,
    default: 0
  },
  paymentSchedule: [{
    paymentNumber: Number,
    dueDate: Date,
    principalAmount: Number,
    interestAmount: Number,
    totalAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'late', 'missed'],
      default: 'pending'
    },
    paidDate: Date,
    actualAmount: Number
  }],
  performance: {
    roi: {
      type: Number,
      default: 0
    },
    annualizedReturn: {
      type: Number,
      default: 0
    },
    daysInvested: {
      type: Number,
      default: 0
    },
    paymentConsistency: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  blockchain: {
    transactionHash: String,
    blockNumber: Number,
    contractAddress: String,
    tokenId: String,
    nftMetadata: {
      name: String,
      description: String,
      image: String,
      attributes: [{
        trait_type: String,
        value: mongoose.Schema.Types.Mixed
      }]
    }
  },
  autoReinvest: {
    enabled: {
      type: Boolean,
      default: false
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    criteria: {
      minAmount: Number,
      maxRiskLevel: String,
      preferredGrades: [String],
      maxLoanAmount: Number
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['manual', 'auto_invest', 'secondary_market'],
      default: 'manual'
    },
    tags: [String],
    notes: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
investmentSchema.virtual('isActive').get(function() {
  return ['active', 'pending'].includes(this.status);
});

investmentSchema.virtual('progressPercentage').get(function() {
  if (this.expectedPayments === 0) return 0;
  return (this.paymentsReceived / this.expectedPayments) * 100;
});

investmentSchema.virtual('currentYield').get(function() {
  if (this.amount === 0 || this.daysInvested === 0) return 0;
  return (this.interestEarned / this.amount) * (365 / this.daysInvested) * 100;
});

// Indexes
investmentSchema.index({ investor: 1 });
investmentSchema.index({ loan: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ investmentDate: -1 });
investmentSchema.index({ 'performance.roi': -1 });
investmentSchema.index({ nextPaymentDate: 1 });

// Compound indexes
investmentSchema.index({ investor: 1, status: 1 });
investmentSchema.index({ loan: 1, investor: 1 });

// Pre-save middleware
investmentSchema.pre('save', function(next) {
  // Calculate remaining amount
  this.remainingAmount = this.amount - this.principalReceived;
  
  // Calculate total received
  this.totalReceived = this.principalReceived + this.interestEarned;
  
  // Calculate performance metrics
  this.calculatePerformanceMetrics();
  
  // Update metadata
  this.metadata.lastUpdated = new Date();
  
  next();
});

// Instance methods
investmentSchema.methods.calculatePerformanceMetrics = function() {
  // Calculate days invested
  this.performance.daysInvested = Math.floor((new Date() - this.investmentDate) / (1000 * 60 * 60 * 24));
  
  // Calculate ROI
  if (this.amount > 0) {
    this.performance.roi = ((this.totalReceived - this.amount) / this.amount) * 100;
  }
  
  // Calculate annualized return
  if (this.performance.daysInvested > 0 && this.amount > 0) {
    this.performance.annualizedReturn = (this.interestEarned / this.amount) * (365 / this.performance.daysInvested) * 100;
  }
  
  // Calculate payment consistency
  if (this.expectedPayments > 0) {
    const onTimePayments = this.paymentSchedule.filter(p => p.status === 'paid' && p.paidDate <= p.dueDate).length;
    this.performance.paymentConsistency = (onTimePayments / this.paymentsReceived) * 100;
  }
};

investmentSchema.methods.generatePaymentSchedule = async function() {
  const Loan = mongoose.model('Loan');
  const loan = await Loan.findById(this.loan);
  
  if (!loan) throw new Error('Loan not found');
  
  this.expectedPayments = loan.term;
  this.monthlyReturn = (this.amount * loan.interestRate / 100) / 12;
  this.expectedReturn = this.monthlyReturn * loan.term;
  
  const schedule = [];
  const startDate = loan.startDate || new Date();
  
  for (let i = 1; i <= loan.term; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    const principalAmount = this.amount / loan.term;
    const interestAmount = this.monthlyReturn;
    
    schedule.push({
      paymentNumber: i,
      dueDate,
      principalAmount,
      interestAmount,
      totalAmount: principalAmount + interestAmount,
      status: 'pending'
    });
  }
  
  this.paymentSchedule = schedule;
  this.nextPaymentDate = schedule[0].dueDate;
  
  return this.save();
};

investmentSchema.methods.recordPayment = async function(paymentAmount, paymentDate = new Date()) {
  // Find the next pending payment
  const nextPayment = this.paymentSchedule.find(p => p.status === 'pending');
  
  if (!nextPayment) {
    throw new Error('No pending payments found');
  }
  
  // Update payment record
  nextPayment.status = 'paid';
  nextPayment.paidDate = paymentDate;
  nextPayment.actualAmount = paymentAmount;
  
  // Update investment totals
  this.principalReceived += nextPayment.principalAmount;
  this.interestEarned += nextPayment.interestAmount;
  this.paymentsReceived += 1;
  this.lastPaymentDate = paymentDate;
  
  // Find next payment date
  const upcomingPayment = this.paymentSchedule.find(p => p.status === 'pending');
  this.nextPaymentDate = upcomingPayment ? upcomingPayment.dueDate : null;
  
  // Check if investment is completed
  if (this.paymentsReceived >= this.expectedPayments) {
    this.status = 'completed';
  }
  
  return this.save();
};

investmentSchema.methods.markAsDefaulted = async function() {
  this.status = 'defaulted';
  
  // Update any pending payments as missed
  this.paymentSchedule.forEach(payment => {
    if (payment.status === 'pending') {
      payment.status = 'missed';
    }
  });
  
  return this.save();
};

investmentSchema.methods.calculateSecondaryMarketValue = function() {
  const remainingPayments = this.paymentSchedule.filter(p => p.status === 'pending');
  const discountRate = 0.15; // 15% discount for liquidity
  
  let presentValue = 0;
  remainingPayments.forEach((payment, index) => {
    const monthsToPayment = index + 1;
    const discountFactor = Math.pow(1 + discountRate / 12, monthsToPayment);
    presentValue += payment.totalAmount / discountFactor;
  });
  
  return Math.max(0, presentValue * 0.95); // Additional 5% discount for transaction costs
};

module.exports = mongoose.model('Investment', investmentSchema);