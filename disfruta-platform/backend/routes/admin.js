const express = require('express');
const {
  getPlatformStats,
  getAllUsers,
  updateUserKYC,
  reviewLoanApplication,
  getPendingLoans,
  updateUserStatus,
  generateReport
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(protect);
router.use(authorize('admin'));

// Platform statistics
router.get('/stats', getPlatformStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/kyc', updateUserKYC);
router.put('/users/:id/status', updateUserStatus);

// Loan management
router.get('/loans/pending', getPendingLoans);
router.put('/loans/:id/review', reviewLoanApplication);

// Reports
router.get('/reports/:type', generateReport);

module.exports = router;