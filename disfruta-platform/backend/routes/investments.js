const express = require('express');
const {
  createInvestment,
  getInvestments,
  getInvestmentById,
  updateInvestment,
  cancelInvestment,
  getInvestmentPerformance,
  getPortfolioSummary
} = require('../controllers/investmentController');
const { protect, requireVerification, requireKYC } = require('../middleware/auth');
const { validateInvestment } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Investment CRUD operations
router.get('/', getInvestments);
router.post('/', requireKYC, validateInvestment, createInvestment);
router.get('/portfolio/summary', getPortfolioSummary);
router.get('/:id', getInvestmentById);
router.put('/:id', updateInvestment);
router.delete('/:id', cancelInvestment);

// Performance tracking
router.get('/:id/performance', getInvestmentPerformance);

module.exports = router;