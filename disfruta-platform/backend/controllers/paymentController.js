const Payment = require('../models/Payment');
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const User = require('../models/User');

// @desc    Create a payment
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res) => {
  try {
    const {
      loanId,
      amount,
      paymentMethod,
      scheduledDate,
      type = 'scheduled'
    } = req.body;

    const loan = await Loan.findById(loanId);
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
        message: 'Not authorized to make payments for this loan'
      });
    }

    // Find the next scheduled payment or create manual payment
    let paymentNumber = 1;
    const existingPayments = await Payment.find({ loan: loanId }).sort({ paymentNumber: -1 }).limit(1);
    if (existingPayments.length > 0) {
      paymentNumber = existingPayments[0].paymentNumber + 1;
    }

    // Calculate principal and interest portions
    const monthlyPayment = loan.monthlyPayment;
    const remainingBalance = loan.remainingBalance || loan.totalRepayment;
    const interestAmount = (remainingBalance * loan.interestRate / 100) / 12;
    const principalAmount = Math.min(amount - interestAmount, remainingBalance - interestAmount);

    const payment = await Payment.create({
      loan: loanId,
      borrower: req.user.id,
      amount,
      principalAmount: Math.max(0, principalAmount),
      interestAmount: Math.max(0, Math.min(interestAmount, amount)),
      type,
      paymentMethod,
      paymentNumber,
      scheduledDate: scheduledDate || new Date(),
      dueDate: scheduledDate || new Date(),
      status: 'pending',
      remainingBalance: Math.max(0, remainingBalance - amount)
    });

    await payment.populate([
      { path: 'loan', select: 'amount purpose status grade' },
      { path: 'borrower', select: 'name email' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating payment',
      details: error.message
    });
  }
};

// @desc    Get all payments with filtering
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const {
      loanId,
      borrowerId,
      status,
      type,
      page = 1,
      limit = 10,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};
    
    if (loanId) query.loan = loanId;
    if (borrowerId) query.borrower = borrowerId;
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    if (type) query.type = type;

    // If not admin, only show user's own payments or payments for loans they invested in
    if (req.user.role !== 'admin') {
      const userLoans = await Loan.find({ borrower: req.user.id }).select('_id');
      const userInvestments = await Investment.find({ investor: req.user.id }).select('loan');
      const investedLoanIds = userInvestments.map(inv => inv.loan);
      const allLoanIds = [...userLoans.map(l => l._id), ...investedLoanIds];
      
      query.$or = [
        { borrower: req.user.id },
        { loan: { $in: allLoanIds } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const payments = await Payment.find(query)
      .populate('loan', 'amount purpose status grade borrower')
      .populate('borrower', 'name email')
      .populate('distribution.investor', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    // Add virtual fields
    const paymentsWithMetrics = payments.map(payment => {
      const paymentObj = payment.toObject();
      paymentObj.totalAmount = payment.totalAmount;
      paymentObj.isOverdue = payment.isOverdue;
      paymentObj.daysPastDue = payment.daysPastDue;
      return paymentObj;
    });

    res.json({
      status: 'success',
      payments: paymentsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payments'
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('loan', 'amount purpose status grade borrower')
      .populate('borrower', 'name email')
      .populate('distribution.investor', 'name email')
      .populate('distribution.investment');

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    // Check authorization
    const canView = 
      req.user.role === 'admin' ||
      payment.borrower._id.toString() === req.user.id ||
      payment.loan.borrower.toString() === req.user.id ||
      (await Investment.exists({ loan: payment.loan._id, investor: req.user.id }));

    if (!canView) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this payment'
      });
    }

    const paymentObj = payment.toObject();
    paymentObj.totalAmount = payment.totalAmount;
    paymentObj.isOverdue = payment.isOverdue;
    paymentObj.daysPastDue = payment.daysPastDue;

    res.json({
      status: 'success',
      payment: paymentObj
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching payment'
    });
  }
};

// @desc    Process a payment
// @route   POST /api/payments/:id/process
// @access  Private
const processPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    // Check authorization
    if (payment.borrower.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to process this payment'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment has already been processed'
      });
    }

    // Process the payment
    await payment.processPayment();

    // Update loan payment record
    const loan = await Loan.findById(payment.loan);
    await loan.recordPayment(payment.amount, payment.paidDate);

    // Distribute to investors
    await payment.distributeToInvestors();

    await payment.populate([
      { path: 'loan', select: 'amount purpose status grade' },
      { path: 'borrower', select: 'name email' }
    ]);

    res.json({
      status: 'success',
      message: 'Payment processed successfully',
      payment
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing payment',
      details: error.message
    });
  }
};

// @desc    Send payment reminder
// @route   POST /api/payments/:id/reminder
// @access  Private (Admin only)
const sendPaymentReminder = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('borrower', 'name email phone preferences');

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot send reminder for completed payment'
      });
    }

    await payment.sendReminder();

    // In a real implementation, you would send email/SMS here
    console.log(`Payment reminder sent to ${payment.borrower.email} for payment ${payment._id}`);

    res.json({
      status: 'success',
      message: 'Payment reminder sent successfully',
      reminderDetails: {
        sentTo: payment.borrower.email,
        reminderCount: payment.notifications.remindersSent,
        escalationLevel: payment.notifications.escalationLevel
      }
    });
  } catch (error) {
    console.error('Send payment reminder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending payment reminder'
    });
  }
};

// @desc    Get overdue payments
// @route   GET /api/payments/overdue
// @access  Private (Admin only)
const getOverduePayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = {
      status: { $in: ['pending', 'failed'] },
      dueDate: { $lt: new Date() }
    };

    const overduePayments = await Payment.find(query)
      .populate('loan', 'amount purpose grade borrower')
      .populate('borrower', 'name email phone')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    const paymentsWithDays = overduePayments.map(payment => {
      const paymentObj = payment.toObject();
      paymentObj.daysPastDue = payment.daysPastDue;
      paymentObj.suggestedLateFee = payment.calculateLateFee();
      return paymentObj;
    });

    res.json({
      status: 'success',
      overduePayments: paymentsWithDays,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalOverdue: total,
        totalAmount: overduePayments.reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('Get overdue payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching overdue payments'
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private (Admin only)
const updatePaymentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment status'
      });
    }

    payment.status = status;
    if (notes) {
      payment.metadata.notes = notes;
    }

    if (status === 'completed' && !payment.completedDate) {
      payment.completedDate = new Date();
      payment.paidDate = new Date();
    }

    await payment.save();

    res.json({
      status: 'success',
      message: 'Payment status updated successfully',
      payment
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating payment status'
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  processPayment,
  sendPaymentReminder,
  getOverduePayments,
  updatePaymentStatus
};