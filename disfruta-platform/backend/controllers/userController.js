const User = require('../models/User');
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('creditHistory')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        address: user.address,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        creditScore: user.creditScore,
        creditHistory: user.creditHistory,
        walletAddress: user.walletAddress,
        bankAccount: user.bankAccount,
        preferences: user.preferences,
        statistics: user.statistics,
        isBorrower: ['borrower', 'both'].includes(user.userType),
        isLender: ['lender', 'both'].includes(user.userType),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, preferences } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile'
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.id);
    user.profilePicture = `/uploads/documents/${req.file.filename}`;
    await user.save();

    res.json({
      status: 'success',
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading profile picture'
    });
  }
};

// @desc    Upload KYC documents
// @route   POST /api/users/kyc-documents
// @access  Private
const uploadKYCDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const user = await User.findById(req.user.id);
    const { documentType } = req.body;

    req.files.forEach(file => {
      user.kycDocuments.push({
        type: documentType,
        url: `/uploads/documents/${file.filename}`,
        status: 'pending'
      });
    });

    user.kycStatus = 'in_review';
    await user.save();

    res.json({
      status: 'success',
      message: 'KYC documents uploaded successfully',
      documents: user.kycDocuments
    });
  } catch (error) {
    console.error('Upload KYC documents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading KYC documents'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/statistics
// @access  Private
const getStatistics = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get additional statistics
    const activeLoans = await Loan.countDocuments({
      borrower: req.user.id,
      status: { $in: ['active', 'funding', 'funded'] }
    });

    const completedLoans = await Loan.countDocuments({
      borrower: req.user.id,
      status: 'completed'
    });

    const activeInvestments = await Investment.countDocuments({
      investor: req.user.id,
      status: 'active'
    });

    const totalInvested = await Investment.aggregate([
      { $match: { investor: user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalEarned = await Investment.aggregate([
      { $match: { investor: user._id } },
      { $group: { _id: null, total: { $sum: '$interestEarned' } } }
    ]);

    res.json({
      status: 'success',
      statistics: {
        creditScore: user.creditScore,
        totalLoaned: user.statistics.totalLoaned,
        totalBorrowed: user.statistics.totalBorrowed,
        totalInvested: totalInvested[0]?.total || 0,
        totalEarned: totalEarned[0]?.total || 0,
        activeLoans,
        completedLoans,
        activeInvestments,
        defaultedLoans: user.statistics.defaultedLoans,
        joinDate: user.createdAt,
        lastActivity: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching statistics'
    });
  }
};

// @desc    Update bank account information
// @route   PUT /api/users/bank-account
// @access  Private
const updateBankAccount = async (req, res) => {
  try {
    const { accountNumber, routingNumber, bankName, accountType } = req.body;
    const user = await User.findById(req.user.id);

    user.bankAccount = {
      accountNumber,
      routingNumber,
      bankName,
      accountType,
      isVerified: false // Will be verified separately
    };

    await user.save();

    res.json({
      status: 'success',
      message: 'Bank account information updated successfully',
      bankAccount: {
        bankName: user.bankAccount.bankName,
        accountType: user.bankAccount.accountType,
        isVerified: user.bankAccount.isVerified
      }
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating bank account information'
    });
  }
};

// @desc    Update wallet address
// @route   PUT /api/users/wallet-address
// @access  Private
const updateWalletAddress = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findById(req.user.id);

    // Basic wallet address validation (for Ethereum addresses)
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid wallet address format'
      });
    }

    user.walletAddress = walletAddress;
    await user.save();

    res.json({
      status: 'success',
      message: 'Wallet address updated successfully',
      walletAddress: user.walletAddress
    });
  } catch (error) {
    console.error('Update wallet address error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating wallet address'
    });
  }
};

// @desc    Get user's loans
// @route   GET /api/users/loans
// @access  Private
const getUserLoans = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { borrower: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const loans = await Loan.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('investments', 'amount investor status');

    const total = await Loan.countDocuments(query);

    res.json({
      status: 'success',
      loans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user loans error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching loans'
    });
  }
};

// @desc    Get user's investments
// @route   GET /api/users/investments
// @access  Private
const getUserInvestments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { investor: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const investments = await Investment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('loan', 'amount purpose status grade interestRate term borrower')
      .populate('loan.borrower', 'name creditScore');

    const total = await Investment.countDocuments(query);

    res.json({
      status: 'success',
      investments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user investments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investments'
    });
  }
};

// @desc    Deactivate user account
// @route   DELETE /api/users/account
// @access  Private
const deactivateAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Incorrect password'
      });
    }

    // Check for active loans or investments
    const activeLoans = await Loan.countDocuments({
      borrower: req.user.id,
      status: { $in: ['active', 'funding', 'funded'] }
    });

    const activeInvestments = await Investment.countDocuments({
      investor: req.user.id,
      status: 'active'
    });

    if (activeLoans > 0 || activeInvestments > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot deactivate account with active loans or investments'
      });
    }

    user.isActive = false;
    user.deactivationReason = reason;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({
      status: 'success',
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deactivating account'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture: [upload.single('profilePicture'), uploadProfilePicture],
  uploadKYCDocuments: [upload.array('documents', 5), uploadKYCDocuments],
  getStatistics,
  updateBankAccount,
  updateWalletAddress,
  getUserLoans,
  getUserInvestments,
  deactivateAccount
};