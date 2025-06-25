const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const User = require('../models/User');
const Payment = require('../models/Payment');

// @desc    Create a new investment
// @route   POST /api/investments
// @access  Private
const createInvestment = async (req, res) => {
  try {
    const { loanId, amount } = req.body;

    const investor = await User.findById(req.user.id);

    // Check if user can invest
    if (!['lender', 'both'].includes(investor.userType)) {
      return res.status(403).json({
        status: 'error',
        message: 'User is not authorized to invest'
      });
    }

    // Check KYC status
    if (investor.kycStatus !== 'verified') {
      return res.status(403).json({
        status: 'error',
        message: 'KYC verification required to invest'
      });
    }

    // Find the loan
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check loan status
    if (!['approved', 'funding'].includes(loan.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Loan is not available for investment'
      });
    }

    // Check if loan is fully funded
    if (loan.isFullyFunded) {
      return res.status(400).json({
        status: 'error',
        message: 'Loan is already fully funded'
      });
    }

    // Check if funding deadline has passed
    if (new Date() > loan.fundingDeadline) {
      return res.status(400).json({
        status: 'error',
        message: 'Funding deadline has passed'
      });
    }

    // Check if investment amount would exceed loan amount
    const remainingAmount = loan.amount - loan.fundedAmount;
    if (amount > remainingAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Investment amount exceeds remaining loan amount of $${remainingAmount}`
      });
    }

    // Check if investor is not the borrower
    if (loan.borrower.toString() === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot invest in your own loan'
      });
    }

    // Calculate investment percentage
    const percentage = (amount / loan.amount) * 100;

    // Create investment
    const investment = await Investment.create({
      investor: req.user.id,
      loan: loanId,
      amount,
      percentage,
      status: 'pending'
    });

    // Update loan funded amount
    await loan.updateFundingAmount(amount);

    // Generate payment schedule for the investment
    await investment.generatePaymentSchedule();

    // Update investor statistics
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'statistics.totalInvested': amount }
    });

    await investment.populate([
      { path: 'investor', select: 'name email' },
      { path: 'loan', select: 'amount purpose status grade interestRate term' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Investment created successfully',
      investment
    });
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating investment',
      details: error.message
    });
  }
};

// @desc    Get all investments with filtering
// @route   GET /api/investments
// @access  Private
const getInvestments = async (req, res) => {
  try {
    const {
      status,
      loanId,
      investorId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    
    if (loanId) {
      query.loan = loanId;
    }
    
    if (investorId) {
      query.investor = investorId;
    }

    // If not admin, only show user's own investments
    if (req.user.role !== 'admin') {
      query.investor = req.user.id;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const investments = await Investment.find(query)
      .populate('investor', 'name email')
      .populate('loan', 'amount purpose status grade interestRate term borrower')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Investment.countDocuments(query);

    // Calculate additional metrics for each investment
    const investmentsWithMetrics = investments.map(investment => {
      const investmentObj = investment.toObject();
      investmentObj.currentYield = investment.currentYield;
      investmentObj.progressPercentage = investment.progressPercentage;
      return investmentObj;
    });

    res.json({
      status: 'success',
      investments: investmentsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investments'
    });
  }
};

// @desc    Get investment by ID
// @route   GET /api/investments/:id
// @access  Private
const getInvestmentById = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate('investor', 'name email')
      .populate('loan', 'amount purpose status grade interestRate term borrower')
      .populate('loan.borrower', 'name creditScore');

    if (!investment) {
      return res.status(404).json({
        status: 'error',
        message: 'Investment not found'
      });
    }

    // Check authorization
    const canView = 
      req.user.role === 'admin' ||
      investment.investor._id.toString() === req.user.id ||
      investment.loan.borrower._id.toString() === req.user.id;

    if (!canView) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this investment'
      });
    }

    const investmentObj = investment.toObject();
    investmentObj.currentYield = investment.currentYield;
    investmentObj.progressPercentage = investment.progressPercentage;

    res.json({
      status: 'success',
      investment: investmentObj
    });
  } catch (error) {
    console.error('Get investment by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investment'
    });
  }
};

// @desc    Update investment
// @route   PUT /api/investments/:id
// @access  Private
const updateInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({
        status: 'error',
        message: 'Investment not found'
      });
    }

    // Check authorization
    const canUpdate = 
      req.user.role === 'admin' ||
      (investment.investor.toString() === req.user.id && investment.status === 'pending');

    if (!canUpdate) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this investment'
      });
    }

    // Only allow updating certain fields
    const allowedFields = ['autoReinvest', 'metadata'];
    const updateFields = Object.keys(req.body);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot update fields: ${invalidFields.join(', ')}`
      });
    }

    Object.assign(investment, req.body);
    await investment.save();

    await investment.populate([
      { path: 'investor', select: 'name email' },
      { path: 'loan', select: 'amount purpose status grade interestRate term' }
    ]);

    res.json({
      status: 'success',
      message: 'Investment updated successfully',
      investment
    });
  } catch (error) {
    console.error('Update investment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating investment'
    });
  }
};

// @desc    Cancel investment
// @route   DELETE /api/investments/:id
// @access  Private
const cancelInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({
        status: 'error',
        message: 'Investment not found'
      });
    }

    // Check authorization
    const canCancel = 
      req.user.role === 'admin' ||
      (investment.investor.toString() === req.user.id && investment.status === 'pending');

    if (!canCancel) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot cancel investment in current status'
      });
    }

    // Update loan funded amount
    const loan = await Loan.findById(investment.loan);
    if (loan) {
      loan.fundedAmount -= investment.amount;
      if (loan.status === 'funded' && loan.fundedAmount < loan.amount) {
        loan.status = 'funding';
      }
      await loan.save();
    }

    // Update investor statistics
    await User.findByIdAndUpdate(investment.investor, {
      $inc: { 'statistics.totalInvested': -investment.amount }
    });

    investment.status = 'cancelled';
    await investment.save();

    res.json({
      status: 'success',
      message: 'Investment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel investment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error cancelling investment'
    });
  }
};

// @desc    Get investment performance
// @route   GET /api/investments/:id/performance
// @access  Private
const getInvestmentPerformance = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate('loan', 'status startDate');

    if (!investment) {
      return res.status(404).json({
        status: 'error',
        message: 'Investment not found'
      });
    }

    // Check authorization
    if (investment.investor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view investment performance'
      });
    }

    // Calculate performance metrics
    investment.calculatePerformanceMetrics();
    await investment.save();

    const performance = {
      roi: investment.performance.roi,
      annualizedReturn: investment.performance.annualizedReturn,
      daysInvested: investment.performance.daysInvested,
      paymentConsistency: investment.performance.paymentConsistency,
      totalReceived: investment.totalReceived,
      principalReceived: investment.principalReceived,
      interestEarned: investment.interestEarned,
      remainingAmount: investment.remainingAmount,
      paymentsReceived: investment.paymentsReceived,
      expectedPayments: investment.expectedPayments,
      paymentSchedule: investment.paymentSchedule,
      secondaryMarketValue: investment.calculateSecondaryMarketValue()
    };

    res.json({
      status: 'success',
      performance
    });
  } catch (error) {
    console.error('Get investment performance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching investment performance'
    });
  }
};

// @desc    Get portfolio summary for investor
// @route   GET /api/investments/portfolio/summary
// @access  Private
const getPortfolioSummary = async (req, res) => {
  try {
    const investorId = req.user.id;

    // Get all investments for the user
    const investments = await Investment.find({ investor: investorId })
      .populate('loan', 'status grade');

    // Calculate portfolio metrics
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReceived = investments.reduce((sum, inv) => sum + inv.totalReceived, 0);
    const activeInvestments = investments.filter(inv => inv.isActive).length;
    const completedInvestments = investments.filter(inv => inv.status === 'completed').length;
    const defaultedInvestments = investments.filter(inv => inv.status === 'defaulted').length;
    
    // Calculate weighted average return
    const weightedReturn = investments.reduce((sum, inv) => {
      const weight = inv.amount / totalInvested;
      return sum + (inv.performance.annualizedReturn * weight);
    }, 0);

    // Grade distribution
    const gradeDistribution = investments.reduce((acc, inv) => {
      const grade = inv.loan.grade;
      acc[grade] = (acc[grade] || 0) + inv.amount;
      return acc;
    }, {});

    // Monthly cash flow (upcoming payments)
    const upcomingPayments = await Investment.aggregate([
      { $match: { investor: investorId, status: 'active' } },
      { $unwind: '$paymentSchedule' },
      { $match: { 'paymentSchedule.status': 'pending' } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentSchedule.dueDate' },
            month: { $month: '$paymentSchedule.dueDate' }
          },
          expectedAmount: { $sum: '$paymentSchedule.totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      status: 'success',
      portfolio: {
        totalInvested,
        totalReceived,
        netReturn: totalReceived - totalInvested,
        roi: totalInvested > 0 ? ((totalReceived - totalInvested) / totalInvested) * 100 : 0,
        weightedAverageReturn: weightedReturn,
        activeInvestments,
        completedInvestments,
        defaultedInvestments,
        totalInvestments: investments.length,
        gradeDistribution,
        upcomingPayments
      }
    });
  } catch (error) {
    console.error('Get portfolio summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching portfolio summary'
    });
  }
};

module.exports = {
  createInvestment,
  getInvestments,
  getInvestmentById,
  updateInvestment,
  cancelInvestment,
  getInvestmentPerformance,
  getPortfolioSummary
};