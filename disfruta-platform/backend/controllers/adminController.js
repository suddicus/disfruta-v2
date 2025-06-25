const User = require('../models/User');
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getPlatformStats = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const kycVerifiedUsers = await User.countDocuments({ kycStatus: 'verified' });
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Loan statistics
    const totalLoans = await Loan.countDocuments();
    const activeLoans = await Loan.countDocuments({ status: { $in: ['active', 'funded'] } });
    const completedLoans = await Loan.countDocuments({ status: 'completed' });
    const defaultedLoans = await Loan.countDocuments({ status: 'defaulted' });
    
    const totalLoanAmount = await Loan.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalFundedAmount = await Loan.aggregate([
      { $group: { _id: null, total: { $sum: '$fundedAmount' } } }
    ]);
    
    // Investment statistics
    const totalInvestments = await Investment.countDocuments();
    const activeInvestments = await Investment.countDocuments({ status: 'active' });
    
    const totalInvestedAmount = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalEarnedAmount = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$interestEarned' } } }
    ]);
    
    // Payment statistics
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const overduePayments = await Payment.countDocuments({ 
      status: { $in: ['pending', 'failed'] },
      dueDate: { $lt: new Date() }
    });
    
    // Monthly growth data
    const monthlyGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          userCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);
    
    // Loan grade distribution
    const loanGradeDistribution = await Loan.aggregate([
      { $group: { _id: '$grade', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      status: 'success',
      stats: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          kycVerified: kycVerifiedUsers,
          active: activeUsers
        },
        loans: {
          total: totalLoans,
          active: activeLoans,
          completed: completedLoans,
          defaulted: defaultedLoans,
          totalAmount: totalLoanAmount[0]?.total || 0,
          totalFunded: totalFundedAmount[0]?.total || 0
        },
        investments: {
          total: totalInvestments,
          active: activeInvestments,
          totalAmount: totalInvestedAmount[0]?.total || 0,
          totalEarned: totalEarnedAmount[0]?.total || 0
        },
        payments: {
          total: totalPayments,
          completed: completedPayments,
          overdue: overduePayments
        },
        growth: {
          monthly: monthlyGrowth,
          loanGrades: loanGradeDistribution
        }
      }
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching platform statistics'
    });
  }
};

// @desc    Get all users with filtering
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const {
      kycStatus,
      isVerified,
      isActive,
      userType,
      page = 1,
      limit = 20,
      search
    } = req.query;
    
    const query = {};
    
    if (kycStatus) query.kycStatus = kycStatus;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (userType) query.userType = userType;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      status: 'success',
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
};

// @desc    Update user KYC status
// @route   PUT /api/admin/users/:id/kyc
// @access  Private (Admin only)
const updateUserKYC = async (req, res) => {
  try {
    const { kycStatus, reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const validStatuses = ['pending', 'in_review', 'verified', 'rejected'];
    if (!validStatuses.includes(kycStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid KYC status'
      });
    }
    
    user.kycStatus = kycStatus;
    
    if (kycStatus === 'verified') {
      // Update credit score when KYC is verified
      user.creditScore = Math.min(user.creditScore + 50, 850);
    }
    
    // Update document statuses if approving KYC
    if (kycStatus === 'verified') {
      user.kycDocuments.forEach(doc => {
        if (doc.status === 'pending') {
          doc.status = 'approved';
        }
      });
    }
    
    await user.save();
    
    res.json({
      status: 'success',
      message: `User KYC status updated to ${kycStatus}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        kycStatus: user.kycStatus,
        creditScore: user.creditScore
      }
    });
  } catch (error) {
    console.error('Update user KYC error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user KYC status'
    });
  }
};

// @desc    Approve/reject loan application
// @route   PUT /api/admin/loans/:id/review
// @access  Private (Admin only)
const reviewLoanApplication = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const loan = await Loan.findById(req.params.id)
      .populate('borrower', 'name email creditScore');
    
    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }
    
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid loan status'
      });
    }
    
    if (loan.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Loan has already been reviewed'
      });
    }
    
    loan.status = status;
    
    if (status === 'approved') {
      loan.approvalDate = new Date();
      loan.status = 'funding'; // Move to funding stage
    }
    
    if (reason) {
      loan.metadata = { ...loan.metadata, reviewReason: reason };
    }
    
    await loan.save();
    
    res.json({
      status: 'success',
      message: `Loan ${status} successfully`,
      loan
    });
  } catch (error) {
    console.error('Review loan application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error reviewing loan application'
    });
  }
};

// @desc    Get pending loan applications
// @route   GET /api/admin/loans/pending
// @access  Private (Admin only)
const getPendingLoans = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const loans = await Loan.find({ status: 'pending' })
      .populate('borrower', 'name email creditScore kycStatus')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Loan.countDocuments({ status: 'pending' });
    
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
    console.error('Get pending loans error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching pending loans'
    });
  }
};

// @desc    Update user status (activate/deactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check for active loans/investments before deactivating
    if (!isActive) {
      const activeLoans = await Loan.countDocuments({
        borrower: user._id,
        status: { $in: ['active', 'funding', 'funded'] }
      });
      
      const activeInvestments = await Investment.countDocuments({
        investor: user._id,
        status: 'active'
      });
      
      if (activeLoans > 0 || activeInvestments > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot deactivate user with active loans or investments'
        });
      }
    }
    
    user.isActive = isActive;
    if (reason) {
      user.deactivationReason = reason;
    }
    
    await user.save();
    
    res.json({
      status: 'success',
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user status'
    });
  }
};

// @desc    Generate platform report
// @route   GET /api/admin/reports/:type
// @access  Private (Admin only)
const generateReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    let reportData;
    
    switch (type) {
      case 'users':
        reportData = await User.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              count: { $sum: 1 },
              verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
              kycVerified: { $sum: { $cond: [{ $eq: ['$kycStatus', 'verified'] }, 1, 0] } }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        break;
        
      case 'loans':
        reportData = await Loan.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              averageAmount: { $avg: '$amount' }
            }
          }
        ]);
        break;
        
      case 'investments':
        reportData = await Investment.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              totalEarned: { $sum: '$interestEarned' }
            }
          }
        ]);
        break;
        
      case 'payments':
        reportData = await Payment.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              averageAmount: { $avg: '$amount' }
            }
          }
        ]);
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid report type'
        });
    }
    
    res.json({
      status: 'success',
      reportType: type,
      dateRange: { startDate, endDate },
      data: reportData
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating report'
    });
  }
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  updateUserKYC,
  reviewLoanApplication,
  getPendingLoans,
  updateUserStatus,
  generateReport
};