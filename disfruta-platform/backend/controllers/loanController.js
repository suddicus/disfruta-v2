const Loan = require('../models/Loan');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Payment = require('../models/Payment');
const { calculateCreditScore } = require('../services/creditScoring');

// @desc    Create a new loan application
// @route   POST /api/loans
// @access  Private
const createLoan = async (req, res) => {
  try {
    const {
      amount,
      purpose,
      term,
      interestRate,
      borrowerInfo
    } = req.body;

    const borrower = await User.findById(req.user.id);

    // Check if user can borrow
    if (!['borrower', 'both'].includes(borrower.userType)) {
      return res.status(403).json({
        status: 'error',
        message: 'User is not authorized to borrow'
      });
    }

    // Check KYC status
    if (borrower.kycStatus !== 'verified') {
      return res.status(403).json({
        status: 'error',
        message: 'KYC verification required to apply for loans'
      });
    }

    // Calculate risk assessment and assign grade
    const riskAssessment = await calculateCreditScore(borrower, borrowerInfo);
    const grade = assignLoanGrade(riskAssessment.riskScore);

    const loan = await Loan.create({
      borrower: req.user.id,
      amount,
      purpose,
      term,
      interestRate: interestRate || calculateInterestRate(grade, riskAssessment),
      grade,
      borrowerInfo,
      riskAssessment,
      status: 'pending'
    });

    await loan.populate('borrower', 'name email creditScore');

    res.status(201).json({
      status: 'success',
      message: 'Loan application submitted successfully',
      loan
    });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating loan application',
      details: error.message
    });
  }
};

// @desc    Get all loans with filtering and pagination
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res) => {
  try {
    const {
      status,
      grade,
      minAmount,
      maxAmount,
      minRate,
      maxRate,
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
    
    if (grade) {
      if (Array.isArray(grade)) {
        query.grade = { $in: grade };
      } else {
        query.grade = grade;
      }
    }
    
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }
    
    if (minRate || maxRate) {
      query.interestRate = {};
      if (minRate) query.interestRate.$gte = parseFloat(minRate);
      if (maxRate) query.interestRate.$lte = parseFloat(maxRate);
    }

    // For public loan listings, only show approved and funding loans
    if (!req.user || req.user.role !== 'admin') {
      query.status = { $in: ['approved', 'funding'] };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const loans = await Loan.find(query)
      .populate('borrower', 'name creditScore kycStatus')
      .populate('investments', 'amount investor status')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Loan.countDocuments(query);

    // Calculate additional metrics for each loan
    const loansWithMetrics = loans.map(loan => {
      const loanObj = loan.toObject();
      loanObj.fundingProgress = loan.fundingProgress;
      loanObj.isFullyFunded = loan.isFullyFunded;
      loanObj.daysRemaining = loan.daysRemaining;
      loanObj.investorCount = loan.investments ? loan.investments.length : 0;
      return loanObj;
    });

    res.json({
      status: 'success',
      loans: loansWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        status: req.query.status,
        grade: req.query.grade,
        amountRange: { min: minAmount, max: maxAmount },
        rateRange: { min: minRate, max: maxRate }
      }
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching loans'
    });
  }
};

// @desc    Get loan by ID
// @route   GET /api/loans/:id
// @access  Private
const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('borrower', 'name email creditScore kycStatus statistics')
      .populate({
        path: 'investments',
        populate: {
          path: 'investor',
          select: 'name'
        }
      });

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check if user can view this loan
    const canView = 
      req.user.role === 'admin' ||
      loan.borrower._id.toString() === req.user.id ||
      loan.status === 'approved' ||
      loan.status === 'funding' ||
      loan.investments.some(inv => inv.investor._id.toString() === req.user.id);

    if (!canView) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this loan'
      });
    }

    const loanObj = loan.toObject();
    loanObj.fundingProgress = loan.fundingProgress;
    loanObj.isFullyFunded = loan.isFullyFunded;
    loanObj.daysRemaining = loan.daysRemaining;

    res.json({
      status: 'success',
      loan: loanObj
    });
  } catch (error) {
    console.error('Get loan by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching loan'
    });
  }
};

// @desc    Update loan
// @route   PUT /api/loans/:id
// @access  Private
const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check authorization
    const canUpdate = 
      req.user.role === 'admin' ||
      (loan.borrower.toString() === req.user.id && loan.status === 'draft');

    if (!canUpdate) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this loan'
      });
    }

    // Prevent updating certain fields after approval
    if (loan.status !== 'draft' && loan.status !== 'pending') {
      const allowedFields = ['purpose']; // Only allow updating purpose for approved loans
      const updateFields = Object.keys(req.body);
      const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot update fields: ${invalidFields.join(', ')} after loan approval`
        });
      }
    }

    Object.assign(loan, req.body);
    await loan.save();

    await loan.populate('borrower', 'name email creditScore');

    res.json({
      status: 'success',
      message: 'Loan updated successfully',
      loan
    });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating loan'
    });
  }
};

// @desc    Delete/Cancel loan
// @route   DELETE /api/loans/:id
// @access  Private
const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check authorization
    const canDelete = 
      req.user.role === 'admin' ||
      (loan.borrower.toString() === req.user.id && ['draft', 'pending'].includes(loan.status));

    if (!canDelete) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete loan in current status'
      });
    }

    // Check if loan has investments
    if (loan.fundedAmount > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete loan that has received investments'
      });
    }

    await Loan.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Loan deleted successfully'
    });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting loan'
    });
  }
};

// @desc    Get loan payments
// @route   GET /api/loans/:id/payments
// @access  Private
const getLoanPayments = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check authorization
    const canView = 
      req.user.role === 'admin' ||
      loan.borrower.toString() === req.user.id ||
      (await Investment.exists({ loan: loan._id, investor: req.user.id }));

    if (!canView) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view loan payments'
      });
    }

    const payments = await Payment.find({ loan: req.params.id })
      .sort({ paymentNumber: 1 })
      .populate('distribution.investor', 'name');

    res.json({
      status: 'success',
      payments
    });
  } catch (error) {
    console.error('Get loan payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching loan payments'
    });
  }
};

// @desc    Generate payment schedule
// @route   POST /api/loans/:id/payment-schedule
// @access  Private
const generatePaymentSchedule = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check authorization
    if (loan.borrower.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to generate payment schedule'
      });
    }

    if (loan.status !== 'funded' && loan.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Loan must be funded to generate payment schedule'
      });
    }

    // Generate payment schedule
    const payments = [];
    const startDate = loan.startDate || new Date();
    
    for (let i = 1; i <= loan.term; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const payment = new Payment({
        loan: loan._id,
        borrower: loan.borrower,
        amount: loan.monthlyPayment,
        principalAmount: loan.amount / loan.term,
        interestAmount: loan.monthlyPayment - (loan.amount / loan.term),
        paymentNumber: i,
        scheduledDate: dueDate,
        dueDate: dueDate,
        paymentMethod: 'bank_transfer',
        status: 'pending'
      });
      
      await payment.save();
      payments.push(payment);
    }

    loan.status = 'active';
    await loan.save();

    res.json({
      status: 'success',
      message: 'Payment schedule generated successfully',
      payments
    });
  } catch (error) {
    console.error('Generate payment schedule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating payment schedule'
    });
  }
};

// Helper functions
const assignLoanGrade = (riskScore) => {
  if (riskScore >= 90) return 'A';
  if (riskScore >= 80) return 'B';
  if (riskScore >= 70) return 'C';
  if (riskScore >= 60) return 'D';
  if (riskScore >= 50) return 'E';
  if (riskScore >= 40) return 'F';
  return 'G';
};

const calculateInterestRate = (grade, riskAssessment) => {
  const baseRates = {
    'A': 8.5,
    'B': 12.0,
    'C': 16.5,
    'D': 21.0,
    'E': 26.5,
    'F': 32.0,
    'G': 35.0
  };
  
  let rate = baseRates[grade] || 35.0;
  
  // Adjust based on risk factors
  if (riskAssessment.debtToIncomeRatio > 0.4) rate += 2.0;
  if (riskAssessment.creditUtilization > 0.8) rate += 1.5;
  
  return Math.min(rate, 35.99); // Cap at 35.99%
};

module.exports = {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  getLoanPayments,
  generatePaymentSchedule
};