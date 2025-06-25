const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  uploadKYCDocuments,
  getStatistics,
  updateBankAccount,
  updateWalletAddress,
  getUserLoans,
  getUserInvestments,
  deactivateAccount
} = require('../controllers/userController');
const { protect, requireVerification, requireKYC } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);
router.post('/profile-picture', uploadProfilePicture);

// KYC routes
router.post('/kyc-documents', uploadKYCDocuments);

// Statistics
router.get('/statistics', getStatistics);

// Financial information
router.put('/bank-account', requireVerification, updateBankAccount);
router.put('/wallet-address', requireVerification, updateWalletAddress);

// User's loans and investments
router.get('/loans', getUserLoans);
router.get('/investments', getUserInvestments);

// Account management
router.delete('/account', deactivateAccount);

module.exports = router;