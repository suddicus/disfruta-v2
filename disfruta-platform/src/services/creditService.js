// Credit scoring service for evaluating borrower creditworthiness
class CreditService {
  constructor() {
    this.baseScore = 300;
    this.maxScore = 850;
    this.weights = {
      paymentHistory: 0.35,
      creditUtilization: 0.30,
      creditLength: 0.15,
      creditMix: 0.10,
      newCredit: 0.10
    };
  }

  // Calculate credit score based on various factors
  calculateCreditScore(creditData) {
    try {
      const {
        paymentHistory = {},
        creditUtilization = 0,
        creditLength = 0,
        creditMix = 0,
        newCredit = 0,
        totalDebt = 0,
        income = 0,
        employmentHistory = 0
      } = creditData;

      let score = this.baseScore;

      // Payment History (35%)
      const paymentScore = this.calculatePaymentHistoryScore(paymentHistory);
      score += paymentScore * this.weights.paymentHistory * 550;

      // Credit Utilization (30%)
      const utilizationScore = this.calculateUtilizationScore(creditUtilization);
      score += utilizationScore * this.weights.creditUtilization * 550;

      // Credit Length (15%)
      const lengthScore = this.calculateCreditLengthScore(creditLength);
      score += lengthScore * this.weights.creditLength * 550;

      // Credit Mix (10%)
      const mixScore = this.calculateCreditMixScore(creditMix);
      score += mixScore * this.weights.creditMix * 550;

      // New Credit (10%)
      const newCreditScore = this.calculateNewCreditScore(newCredit);
      score += newCreditScore * this.weights.newCredit * 550;

      // Additional factors
      score += this.calculateIncomeScore(income, totalDebt);
      score += this.calculateEmploymentScore(employmentHistory);

      // Ensure score is within bounds
      return Math.max(this.baseScore, Math.min(this.maxScore, Math.round(score)));
    } catch (error) {
      console.error('Credit score calculation failed:', error);
      return this.baseScore;
    }
  }

  // Calculate payment history score (0-1)
  calculatePaymentHistoryScore(paymentHistory) {
    const {
      totalPayments = 0,
      onTimePayments = 0,
      latePayments = 0,
      missedPayments = 0
    } = paymentHistory;

    if (totalPayments === 0) return 0.5; // Neutral score for no history

    const onTimeRatio = onTimePayments / totalPayments;
    const lateRatio = latePayments / totalPayments;
    const missedRatio = missedPayments / totalPayments;

    // Weight penalties
    const score = onTimeRatio - (lateRatio * 0.5) - (missedRatio * 1.0);
    return Math.max(0, Math.min(1, score));
  }

  // Calculate credit utilization score (0-1)
  calculateUtilizationScore(utilization) {
    if (utilization <= 0.1) return 1.0; // Excellent
    if (utilization <= 0.3) return 0.8; // Good
    if (utilization <= 0.5) return 0.6; // Fair
    if (utilization <= 0.7) return 0.4; // Poor
    return 0.2; // Very poor
  }

  // Calculate credit length score (0-1)
  calculateCreditLengthScore(lengthInMonths) {
    if (lengthInMonths >= 120) return 1.0; // 10+ years
    if (lengthInMonths >= 60) return 0.8;  // 5+ years
    if (lengthInMonths >= 24) return 0.6;  // 2+ years
    if (lengthInMonths >= 12) return 0.4;  // 1+ year
    return 0.2; // Less than 1 year
  }

  // Calculate credit mix score (0-1)
  calculateCreditMixScore(creditTypes) {
    // creditTypes should be number of different credit types
    if (creditTypes >= 4) return 1.0;
    if (creditTypes >= 3) return 0.8;
    if (creditTypes >= 2) return 0.6;
    if (creditTypes >= 1) return 0.4;
    return 0.2;
  }

  // Calculate new credit score (0-1)
  calculateNewCreditScore(recentInquiries) {
    if (recentInquiries === 0) return 1.0;
    if (recentInquiries <= 2) return 0.8;
    if (recentInquiries <= 4) return 0.6;
    if (recentInquiries <= 6) return 0.4;
    return 0.2;
  }

  // Calculate income-to-debt ratio bonus
  calculateIncomeScore(income, totalDebt) {
    if (income <= 0) return 0;
    
    const debtToIncomeRatio = totalDebt / (income * 12); // Monthly to annual
    
    if (debtToIncomeRatio <= 0.2) return 50; // Excellent
    if (debtToIncomeRatio <= 0.36) return 30; // Good
    if (debtToIncomeRatio <= 0.5) return 10; // Fair
    return -20; // Poor
  }

  // Calculate employment history bonus
  calculateEmploymentScore(employmentMonths) {
    if (employmentMonths >= 24) return 30; // 2+ years
    if (employmentMonths >= 12) return 20; // 1+ year
    if (employmentMonths >= 6) return 10;  // 6+ months
    return 0;
  }

  // Determine risk level based on credit score
  getRiskLevel(creditScore) {
    if (creditScore >= 750) return 'low';
    if (creditScore >= 650) return 'medium';
    return 'high';
  }

  // Get interest rate recommendation based on credit score
  getRecommendedInterestRate(creditScore, baseLoanRate = 8.0) {
    const riskMultiplier = this.getRiskMultiplier(creditScore);
    return baseLoanRate * riskMultiplier;
  }

  // Get risk multiplier for interest rate calculation
  getRiskMultiplier(creditScore) {
    if (creditScore >= 750) return 1.0;   // Excellent
    if (creditScore >= 700) return 1.2;   // Good
    if (creditScore >= 650) return 1.5;   // Fair
    if (creditScore >= 600) return 2.0;   // Poor
    return 2.5; // Very poor
  }

  // Calculate loan approval probability
  calculateApprovalProbability(creditScore, requestedAmount, income) {
    let probability = 0;

    // Base probability from credit score
    if (creditScore >= 750) probability += 0.9;
    else if (creditScore >= 700) probability += 0.8;
    else if (creditScore >= 650) probability += 0.6;
    else if (creditScore >= 600) probability += 0.4;
    else probability += 0.2;

    // Adjust for loan amount vs income
    const annualIncome = income * 12;
    const loanToIncomeRatio = requestedAmount / annualIncome;

    if (loanToIncomeRatio <= 2) probability *= 1.0;
    else if (loanToIncomeRatio <= 3) probability *= 0.8;
    else if (loanToIncomeRatio <= 4) probability *= 0.6;
    else probability *= 0.4;

    return Math.max(0, Math.min(1, probability));
  }

  // Generate credit report summary
  generateCreditReport(creditData) {
    const score = this.calculateCreditScore(creditData);
    const riskLevel = this.getRiskLevel(score);
    const recommendedRate = this.getRecommendedInterestRate(score);
    const approvalProbability = this.calculateApprovalProbability(
      score,
      creditData.requestedAmount || 0,
      creditData.income || 0
    );

    return {
      creditScore: score,
      riskLevel,
      recommendedInterestRate: Math.round(recommendedRate * 100) / 100,
      approvalProbability: Math.round(approvalProbability * 100),
      factors: this.getScoreFactors(creditData),
      recommendations: this.getRecommendations(score, creditData)
    };
  }

  // Get detailed score factors
  getScoreFactors(creditData) {
    const factors = [];

    // Payment history
    if (creditData.paymentHistory?.onTimePayments > 0) {
      const ratio = creditData.paymentHistory.onTimePayments / creditData.paymentHistory.totalPayments;
      factors.push({
        factor: 'Payment History',
        impact: ratio >= 0.95 ? 'positive' : ratio >= 0.8 ? 'neutral' : 'negative',
        description: `${Math.round(ratio * 100)}% of payments made on time`
      });
    }

    // Credit utilization
    if (creditData.creditUtilization !== undefined) {
      const utilization = creditData.creditUtilization * 100;
      factors.push({
        factor: 'Credit Utilization',
        impact: utilization <= 30 ? 'positive' : utilization <= 50 ? 'neutral' : 'negative',
        description: `${Math.round(utilization)}% credit utilization`
      });
    }

    // Income stability
    if (creditData.income > 0) {
      factors.push({
        factor: 'Income',
        impact: creditData.income >= 3000 ? 'positive' : creditData.income >= 1500 ? 'neutral' : 'negative',
        description: `Monthly income: $${creditData.income.toLocaleString()}`
      });
    }

    return factors;
  }

  // Get recommendations for credit improvement
  getRecommendations(creditScore, creditData) {
    const recommendations = [];

    if (creditScore < 650) {
      recommendations.push('Make all payments on time to improve payment history');
      recommendations.push('Reduce outstanding debt balances');
    }

    if (creditData.creditUtilization > 0.3) {
      recommendations.push('Lower credit utilization below 30%');
    }

    if (creditData.creditLength < 24) {
      recommendations.push('Build longer credit history over time');
    }

    if (creditScore >= 750) {
      recommendations.push('Excellent credit! You qualify for the best rates');
    }

    return recommendations;
  }

  // Validate credit data
  validateCreditData(creditData) {
    const errors = [];

    if (!creditData.income || creditData.income <= 0) {
      errors.push('Valid income is required');
    }

    if (creditData.creditUtilization < 0 || creditData.creditUtilization > 1) {
      errors.push('Credit utilization must be between 0 and 1');
    }

    if (creditData.creditLength < 0) {
      errors.push('Credit length cannot be negative');
    }

    return errors;
  }
}

export const creditService = new CreditService();