const express = require('express');
const {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  getLoanPayments,
  generatePaymentSchedule
} = require('../controllers/loanController');
const { protect, requireVerification, requireKYC } = require('../middleware/auth');
const { validateLoanApplication } = require('../middleware/validation');

const router = express.Router();

// Public routes (for browsing available loans)
router.get('/', getLoans);
router.get('/:id', getLoanById);

// Protected routes
router.use(protect);

// Create and manage loans (requires KYC for borrowers)
router.post('/', requireKYC, validateLoanApplication, createLoan);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);

// Payment related routes
router.get('/:id/payments', getLoanPayments);
router.post('/:id/payment-schedule', generatePaymentSchedule);

module.exports = router;