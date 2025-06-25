const User = require('../models/User');

/**
 * Calculate credit score based on user information and loan application data
 * @param {Object} user - User document from database
 * @param {Object} borrowerInfo - Borrower information from loan application
 * @returns {Object} Risk assessment object with scores and metrics
 */
const calculateCreditScore = async (user, borrowerInfo) => {
  try {
    let riskScore = 0;
    const factors = {};

    // Base credit score from user profile (40% weight)
    const creditScoreWeight = 0.4;
    const normalizedCreditScore = (user.creditScore - 300) / (850 - 300); // Normalize to 0-1
    riskScore += normalizedCreditScore * 100 * creditScoreWeight;
    factors.creditScore = {
      value: user.creditScore,
      score: normalizedCreditScore * 100,
      weight: creditScoreWeight
    };

    // Debt-to-income ratio (25% weight)
    const debtToIncomeWeight = 0.25;
    const debtToIncomeRatio = borrowerInfo.monthlyDebtPayments / (borrowerInfo.annualIncome / 12);
    let debtToIncomeScore = 100;
    
    if (debtToIncomeRatio > 0.5) {
      debtToIncomeScore = 20; // Very high debt
    } else if (debtToIncomeRatio > 0.4) {
      debtToIncomeScore = 40; // High debt
    } else if (debtToIncomeRatio > 0.3) {
      debtToIncomeScore = 60; // Moderate debt
    } else if (debtToIncomeRatio > 0.2) {
      debtToIncomeScore = 80; // Low debt
    }
    
    riskScore += debtToIncomeScore * debtToIncomeWeight;
    factors.debtToIncome = {
      ratio: debtToIncomeRatio,
      score: debtToIncomeScore,
      weight: debtToIncomeWeight
    };

    // Employment status and stability (20% weight)
    const employmentWeight = 0.2;
    let employmentScore = 50; // Default for unemployed
    
    switch (borrowerInfo.employmentStatus) {
      case 'employed':
        employmentScore = 90;
        if (borrowerInfo.yearsEmployed > 5) employmentScore = 100;
        else if (borrowerInfo.yearsEmployed > 2) employmentScore = 95;
        break;
      case 'self_employed':
        employmentScore = 70;
        if (borrowerInfo.yearsEmployed > 3) employmentScore = 80;
        break;
      case 'retired':
        employmentScore = 85; // Stable income
        break;
      case 'student':
        employmentScore = 40;
        break;
      default:
        employmentScore = 30;
    }
    
    riskScore += employmentScore * employmentWeight;
    factors.employment = {
      status: borrowerInfo.employmentStatus,
      years: borrowerInfo.yearsEmployed,
      score: employmentScore,
      weight: employmentWeight
    };

    // KYC and verification status (10% weight)
    const verificationWeight = 0.1;
    let verificationScore = 0;
    
    if (user.isVerified) verificationScore += 50;
    if (user.kycStatus === 'verified') verificationScore += 50;
    
    riskScore += verificationScore * verificationWeight;
    factors.verification = {
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
      score: verificationScore,
      weight: verificationWeight
    };

    // Home ownership (5% weight)
    const homeOwnershipWeight = 0.05;
    let homeOwnershipScore = 50;
    
    switch (borrowerInfo.homeOwnership) {
      case 'own':
        homeOwnershipScore = 100;
        break;
      case 'mortgage':
        homeOwnershipScore = 80;
        break;
      case 'rent':
        homeOwnershipScore = 60;
        break;
      default:
        homeOwnershipScore = 40;
    }
    
    riskScore += homeOwnershipScore * homeOwnershipWeight;
    factors.homeOwnership = {
      status: borrowerInfo.homeOwnership,
      score: homeOwnershipScore,
      weight: homeOwnershipWeight
    };

    // Determine risk level
    let riskLevel = 'very_high';
    if (riskScore >= 80) riskLevel = 'low';
    else if (riskScore >= 65) riskLevel = 'medium';
    else if (riskScore >= 50) riskLevel = 'high';

    // Calculate additional metrics
    const creditUtilization = Math.min(debtToIncomeRatio * 1.5, 1); // Approximate credit utilization
    const paymentHistory = normalizedCreditScore; // Use credit score as proxy
    const lengthOfCreditHistory = Math.min((borrowerInfo.yearsEmployed || 0) / 10, 1);

    return {
      riskScore: Math.round(riskScore),
      riskLevel,
      debtToIncomeRatio,
      creditUtilization,
      paymentHistory: Math.round(paymentHistory * 100),
      lengthOfCreditHistory: Math.round(lengthOfCreditHistory * 100),
      factors,
      calculatedAt: new Date()
    };

  } catch (error) {
    console.error('Credit scoring error:', error);
    // Return default conservative assessment
    return {
      riskScore: 40,
      riskLevel: 'high',
      debtToIncomeRatio: 0.5,
      creditUtilization: 0.8,
      paymentHistory: 50,
      lengthOfCreditHistory: 30,
      factors: {},
      calculatedAt: new Date(),
      error: 'Failed to calculate comprehensive score'
    };
  }
};

/**
 * Update user credit score based on loan performance
 * @param {String} userId - User ID
 * @param {String} action - Action type (payment, default, completion)
 * @param {Object} details - Additional details for score calculation
 */
const updateCreditScore = async (userId, action, details = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let scoreChange = 0;
    let reason = '';

    switch (action) {
      case 'on_time_payment':
        scoreChange = 2;
        reason = 'On-time payment';
        break;
      case 'late_payment':
        scoreChange = -5;
        reason = 'Late payment';
        break;
      case 'missed_payment':
        scoreChange = -10;
        reason = 'Missed payment';
        break;
      case 'loan_completion':
        scoreChange = 15;
        reason = 'Successful loan completion';
        break;
      case 'loan_default':
        scoreChange = -50;
        reason = 'Loan default';
        break;
      case 'kyc_verification':
        scoreChange = 25;
        reason = 'KYC verification completed';
        break;
      default:
        scoreChange = 0;
        reason = 'No score change';
    }

    if (scoreChange !== 0) {
      const newScore = Math.max(300, Math.min(850, user.creditScore + scoreChange));
      await user.updateCreditScore(newScore, reason);
    }

    return {
      success: true,
      oldScore: user.creditScore,
      newScore: user.creditScore + scoreChange,
      change: scoreChange,
      reason
    };

  } catch (error) {
    console.error('Update credit score error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get credit score trends for a user
 * @param {String} userId - User ID
 * @param {Number} months - Number of months to look back
 */
const getCreditScoreTrends = async (userId, months = 12) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get recent credit history
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const recentHistory = user.creditHistory
      .filter(entry => entry.date >= cutoffDate)
      .sort((a, b) => a.date - b.date);

    // Calculate monthly averages
    const monthlyData = {};
    recentHistory.forEach(entry => {
      const monthKey = `${entry.date.getFullYear()}-${entry.date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { scores: [], month: monthKey };
      }
      monthlyData[monthKey].scores.push(entry.score);
    });

    const trends = Object.values(monthlyData).map(month => ({
      month: month.month,
      averageScore: Math.round(month.scores.reduce((a, b) => a + b, 0) / month.scores.length),
      changeCount: month.scores.length
    }));

    return {
      currentScore: user.creditScore,
      trends,
      totalChanges: recentHistory.length,
      periodMonths: months
    };

  } catch (error) {
    console.error('Get credit score trends error:', error);
    return {
      currentScore: user.creditScore || 650,
      trends: [],
      totalChanges: 0,
      periodMonths: months,
      error: error.message
    };
  }
};

module.exports = {
  calculateCreditScore,
  updateCreditScore,
  getCreditScoreTrends
};