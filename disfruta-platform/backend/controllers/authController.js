const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const mockDB = require('../services/mockDatabase');
const { generateToken, generateRefreshToken } = require('../config/jwt');

// Use mock database when MongoDB is not available
const useDatabase = process.env.NODE_ENV === 'production' || process.env.MONGODB_URI;
const db = useDatabase ? User : mockDB;

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, userType, phoneNumber, address } = req.body;

    console.log('📝 Registration request:', { firstName, lastName, email, userType });

    // Check if user exists
    const existingUser = await db.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Create user with statistics
    const userData = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      userType,
      phone: phoneNumber,
      address,
      emailVerificationToken: crypto.randomBytes(20).toString('hex'),
      emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isVerified: true, // Auto-verify for demo
      isActive: true,
      statistics: {
        totalLoaned: 0,
        totalBorrowed: 0,
        totalInvested: 0,
        totalEarned: 0,
        activeLoans: 0,
        completedLoans: 0,
        defaultedLoans: 0
      }
    };

    // Create user - this will trigger pre-save middleware once
    const user = await db.create(userData);

    console.log('✅ User created successfully:', user.email);

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Create response user object (don't modify the original user)
    const responseUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
      creditScore: user.creditScore,
      phone: user.phone,
      address: user.address,
      statistics: user.statistics,
      isBorrower: ['borrower', 'both'].includes(user.userType),
      isLender: ['lender', 'both'].includes(user.userType)
    };

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your email.',
      token,
      refreshToken,
      user: responseUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      details: error.message
    });
  }
}
// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await db.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Remove password from output
    user.password = undefined;

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        creditScore: user.creditScore,
        profilePicture: user.profilePicture,
        isBorrower: ['borrower', 'both'].includes(user.userType),
        isLender: ['lender', 'both'].includes(user.userType),
        statistics: user.statistics
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      details: error.message
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await db.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newToken = generateToken({ id: user._id });
    const newRefreshToken = generateRefreshToken({ id: user._id });

    res.json({
      status: 'success',
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid refresh token'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await db.findById(req.user.id);
    
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
        walletAddress: user.walletAddress,
        bankAccount: user.bankAccount,
        preferences: user.preferences,
        statistics: user.statistics,
        isBorrower: ['borrower', 'both'].includes(user.userType),
        isLender: ['lender', 'both'].includes(user.userType),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await db.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    
    await user.save();

    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Email verification failed'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await db.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with that email address'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // In a real implementation, you would send an email here
    // For demo purposes, we'll just return the token
    res.json({
      status: 'success',
      message: 'Password reset token sent to email',
      resetToken: resetToken // Remove this in production
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Password reset request failed'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await db.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new token
    const token = generateToken({ id: user._id });

    res.json({
      status: 'success',
      message: 'Password reset successful',
      token
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Password reset failed'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await db.findById(req.user.id);

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Password change failed'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword
};