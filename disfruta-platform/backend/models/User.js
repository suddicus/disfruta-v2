const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      // Only require password for new documents or when password is being modified
      return this.isNew && !this.password;
    },
    // required: false,
    minlength: 8,
    // select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  userType: {
    type: String,
    enum: ['borrower', 'lender', 'both'],
    required: [true, 'Please specify user type']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'United States'
    }
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocuments: [{
    type: {
      type: String,
      enum: ['id', 'passport', 'license', 'utility_bill', 'bank_statement']
    },
    url: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  creditScore: {
    type: Number,
    min: 300,
    max: 850,
    default: 650
  },
  creditHistory: [{
    score: Number,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  walletAddress: {
    type: String,
    trim: true
  },
  bankAccount: {
    accountNumber: String,
    routingNumber: String,
    bankName: String,
    accountType: {
      type: String,
      enum: ['checking', 'savings']
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    riskTolerance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  statistics: {
    totalLoaned: {
      type: Number,
      default: 0
    },
    totalBorrowed: {
      type: Number,
      default: 0
    },
    totalInvested: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    activeLoans: {
      type: Number,
      default: 0
    },
    completedLoans: {
      type: Number,
      default: 0
    },
    defaultedLoans: {
      type: Number,
      default: 0
    }
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ kycStatus: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ creditScore: 1 });

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  console.log('🔍 Pre-save middleware triggered');
  console.log('🔍 Password modified?', this.isModified('password'));
  console.log('🔍 Raw password value:', this.password);
  console.log('🔍 Password type:', typeof this.password);
  
  if (!this.isModified('password')) {
    return next();
  }

  // const salt = await bcrypt.genSalt(10);
  // this.password = await bcrypt.hash(this.password, salt);
  // next();
  // Check if password is already hashed (starts with $2a$ or $2b$)
  if (this.password && this.password.startsWith('$2')) {
    console.log('🔍 Password already hashed, skipping...');
    return next();
  }

  // Add validation to ensure password exists and is a string
  if (!this.password || typeof this.password !== 'string') {
    console.error('🔍 Password is invalid:', this.password);
    return next(new Error('Password is required and must be a string'));
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('🔍 Password hashed successfully in pre-save middleware');
    next();
  } catch (error) {
    console.error('🔍 Error in pre-save middleware:', error);
    next(error);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add this method to userSchema.methods
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Update credit score
userSchema.methods.updateCreditScore = function(newScore, reason) {
  this.creditHistory.push({
    score: this.creditScore,
    reason: reason || 'Score update',
    date: new Date()
  });
  this.creditScore = newScore;
  return this.save();
};

// Handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we have max attempts and aren't locked, lock account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

module.exports = mongoose.model('User', userSchema);