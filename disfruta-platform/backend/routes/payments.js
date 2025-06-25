const express = require('express');
const {
  createPayment,
  getPayments,
  getPaymentById,
  processPayment,
  sendPaymentReminder,
  getOverduePayments,
  updatePaymentStatus
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Payment CRUD operations
router.get('/', getPayments);
router.post('/', createPayment);
router.get('/overdue', authorize('admin', 'moderator'), getOverduePayments);
router.get('/:id', getPaymentById);

// Payment processing
router.post('/:id/process', processPayment);
router.post('/:id/reminder', authorize('admin', 'moderator'), sendPaymentReminder);
router.put('/:id/status', authorize('admin', 'moderator'), updatePaymentStatus);

module.exports = router;