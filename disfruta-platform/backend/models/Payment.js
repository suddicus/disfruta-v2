const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan is required']
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Borrower is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be positive']
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestAmount: {
    type: Number,
    required: true,
    min: 0
  },
  fees: {
    type: Number,
    default: 0,
    min: 0
  },
  type: {
    type: String,
    enum: ['scheduled', 'early', 'late', 'partial', 'full_repayment'],
    default: 'scheduled'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'debit_card', 'ach', 'wire', 'crypto', 'other'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  processingDate: Date,
  completedDate: Date,
  paymentNumber: {
    type: Number,
    required: true,
    min: 1
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateDays: {
    type: Number,
    default: 0,
    min: 0
  },
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactionDetails: {
    transactionId: String,
    confirmationNumber: String,
    processorResponse: String,
    processorTransactionId: String,
    bankTransactionId: String
  },
  blockchain: {
    transactionHash: String,
    blockNumber: Number,
    gasUsed: Number,
    gasFee: Number,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending'
    }
  },
  distribution: [{
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: true
    },
    principalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    interestAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['pending', 'distributed', 'failed'],
      default: 'pending'
    },
    distributedDate: Date
  }],
  attempts: [{
    attemptNumber: Number,
    attemptDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending']
    },
    failureReason: String,
    amount: Number
  }],
  notifications: {
    remindersSent: {
      type: Number,
      default: 0
    },
    lastReminderDate: Date,
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3
    }
  },
  metadata: {
    notes: String,
    tags: [String],
    source: {
      type: String,
      enum: ['manual', 'automatic', 'api', 'bulk_import'],
      default: 'manual'
    },
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
paymentSchema.virtual('totalAmount').get(function() {
  return this.principalAmount + this.interestAmount + this.fees + this.lateFee;
});

paymentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate && this.status !== 'completed';
});

paymentSchema.virtual('daysPastDue').get(function() {
  if (!this.isOverdue) return 0;
  const now = new Date();
  const diffTime = now - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes
paymentSchema.index({ loan: 1 });
paymentSchema.index({ borrower: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ scheduledDate: 1 });
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ isLate: 1 });

// Compound indexes
paymentSchema.index({ loan: 1, paymentNumber: 1 });
paymentSchema.index({ borrower: 1, status: 1 });
paymentSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  // Calculate if payment is late
  if (this.paidDate && this.dueDate) {
    this.isLate = this.paidDate > this.dueDate;
    if (this.isLate) {
      this.lateDays = Math.ceil((this.paidDate - this.dueDate) / (1000 * 60 * 60 * 24));
    }
  }
  
  // Update metadata
  this.metadata.lastUpdated = new Date();
  
  next();
});

// Instance methods
paymentSchema.methods.calculateLateFee = function() {
  if (!this.isLate || this.lateDays === 0) return 0;
  
  // Late fee calculation: 5% of payment amount plus $25 flat fee
  const percentageFee = this.amount * 0.05;
  const flatFee = 25;
  
  return Math.min(percentageFee + flatFee, this.amount * 0.1); // Cap at 10% of payment
};

paymentSchema.methods.processPayment = async function() {
  this.status = 'processing';
  this.processingDate = new Date();
  
  try {
    // Process payment logic would go here
    // For now, we'll simulate success
    this.status = 'completed';
    this.completedDate = new Date();
    this.paidDate = new Date();
    
    // Calculate late fees if applicable
    if (this.isLate) {
      this.lateFee = this.calculateLateFee();
    }
    
    return await this.save();
  } catch (error) {
    this.status = 'failed';
    this.attempts.push({
      attemptNumber: this.attempts.length + 1,
      status: 'failed',
      failureReason: error.message,
      amount: this.amount
    });
    
    await this.save();
    throw error;
  }
};

paymentSchema.methods.distributeToInvestors = async function() {
  if (this.status !== 'completed') {
    throw new Error('Payment must be completed before distribution');
  }
  
  const Investment = mongoose.model('Investment');
  const investments = await Investment.find({ 
    loan: this.loan,
    status: 'active'
  }).populate('investor');
  
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
  
  for (const investment of investments) {
    const percentage = (investment.amount / totalInvestment) * 100;
    const principalPortion = (this.principalAmount * percentage) / 100;
    const interestPortion = (this.interestAmount * percentage) / 100;
    
    this.distribution.push({
      investor: investment.investor._id,
      investment: investment._id,
      principalAmount: principalPortion,
      interestAmount: interestPortion,
      totalAmount: principalPortion + interestPortion,
      percentage: percentage,
      status: 'distributed',
      distributedDate: new Date()
    });
    
    // Update investment
    await investment.recordPayment(principalPortion + interestPortion);
  }
  
  return await this.save();
};

paymentSchema.methods.sendReminder = async function() {
  if (this.status === 'completed') return;
  
  this.notifications.remindersSent += 1;
  this.notifications.lastReminderDate = new Date();
  
  // Escalate based on number of reminders
  if (this.notifications.remindersSent > 3) {
    this.notifications.escalationLevel = 3; // Legal action
  } else if (this.notifications.remindersSent > 2) {
    this.notifications.escalationLevel = 2; // Final notice
  } else if (this.notifications.remindersSent > 1) {
    this.notifications.escalationLevel = 1; // Urgent reminder
  }
  
  return await this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);