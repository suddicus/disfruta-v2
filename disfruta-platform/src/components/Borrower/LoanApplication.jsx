import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calculator, FileText, DollarSign, Calendar, Target, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { blockchainService } from '../../services/blockchain';
import { creditService } from '../../services/creditService';
import toast from 'react-hot-toast';

const loanApplicationSchema = z.object({
  amount: z.number().min(1000, 'Minimum loan amount is $1,000').max(50000, 'Maximum loan amount is $50,000'),
  interestRate: z.number().min(5, 'Minimum interest rate is 5%').max(30, 'Maximum interest rate is 30%'),
  termInMonths: z.number().min(12, 'Minimum term is 12 months').max(60, 'Maximum term is 60 months'),
  purpose: z.string().min(10, 'Please provide a detailed purpose (minimum 10 characters)').max(500, 'Purpose cannot exceed 500 characters'),
  monthlyIncome: z.number().min(1000, 'Please enter your monthly income'),
  monthlyExpenses: z.number().min(0, 'Monthly expenses cannot be negative'),
  employmentYears: z.number().min(0, 'Employment years cannot be negative'),
  creditHistory: z.string().min(1, 'Please select your credit history'),
});

const LoanApplication = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [creditScore, setCreditScore] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isConnected, account } = useSelector((state) => state.blockchain);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      amount: 5000,
      interestRate: 12,
      termInMonths: 24,
      purpose: '',
      monthlyIncome: 0,
      monthlyExpenses: 0,
      employmentYears: 0,
      creditHistory: ''
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    calculatePayments();
  }, [watchedValues.amount, watchedValues.interestRate, watchedValues.termInMonths]);

  useEffect(() => {
    if (user && isConnected) {
      loadCreditScore();
    }
  }, [user, isConnected]);

  const calculatePayments = () => {
    const { amount, interestRate, termInMonths } = watchedValues;
    
    if (amount && interestRate && termInMonths) {
      const monthlyRate = interestRate / 100 / 12;
      const numPayments = termInMonths;
      
      const monthly = (amount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                     (Math.pow(1 + monthlyRate, numPayments) - 1);
      
      setMonthlyPayment(monthly);
      setTotalPayment(monthly * numPayments);
    }
  };

  const loadCreditScore = async () => {
    try {
      const score = await creditService.getCreditScore(account);
      setCreditScore(score);
    } catch (error) {
      console.error('Error loading credit score:', error);
    }
  };

  const performRiskAssessment = async (formData) => {
    try {
      const assessment = await creditService.performRiskAssessment(account, {
        monthlyIncome: formData.monthlyIncome,
        monthlyExpenses: formData.monthlyExpenses,
        employmentYears: formData.employmentYears,
        creditHistory: formData.creditHistory,
        requestedAmount: formData.amount,
        debtToIncomeRatio: (formData.monthlyExpenses / formData.monthlyIncome) * 100
      });
      
      setRiskAssessment(assessment);
      
      // Adjust interest rate based on risk assessment
      if (assessment.recommendedRate) {
        setValue('interestRate', assessment.recommendedRate / 100);
      }
      
      return assessment.approved;
    } catch (error) {
      console.error('Risk assessment error:', error);
      toast.error('Failed to perform risk assessment');
      return false;
    }
  };

  const submitLoanApplication = async (data) => {
    setIsLoading(true);
    
    try {
      // First perform risk assessment
      const approved = await performRiskAssessment(data);
      
      if (!approved) {
        toast.error('Loan application does not meet current lending criteria');
        setIsLoading(false);
        return;
      }

      // Create loan on blockchain
      const loanData = {
        amount: data.amount,
        interestRate: Math.floor(data.interestRate * 100), // Convert to basis points
        termInMonths: data.termInMonths,
        purpose: data.purpose
      };

      const txHash = await blockchainService.createLoan(loanData);
      
      toast.success('Loan application submitted successfully!');
      toast.info(`Transaction Hash: ${txHash}`);
      
      // Reset form and go to step 4 (success)
      setStep(4);
      
    } catch (error) {
      console.error('Loan application error:', error);
      
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.message.includes('BorrowerNotVerified')) {
        toast.error('Please complete KYC verification before applying for a loan');
      } else {
        toast.error('Failed to submit loan application. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const creditHistoryOptions = [
    { value: 'excellent', label: 'Excellent (750+)' },
    { value: 'good', label: 'Good (700-749)' },
    { value: 'fair', label: 'Fair (650-699)' },
    { value: 'poor', label: 'Poor (600-649)' },
    { value: 'no_credit', label: 'No Credit History' }
  ];

  const loanPurposes = [
    'Business expansion',
    'Debt consolidation',
    'Home improvement',
    'Education',
    'Medical expenses',
    'Wedding',
    'Vacation',
    'Emergency expenses',
    'Vehicle purchase',
    'Other'
  ];

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loan Details</h2>
        <p className="text-gray-600">Tell us about the loan you need</p>
      </div>

      {/* Loan Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loan Amount
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            {...register('amount', { valueAsNumber: true })}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5000"
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
        )}
      </div>

      {/* Interest Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interest Rate (Annual %)
        </label>
        <input
          type="number"
          step="0.1"
          {...register('interestRate', { valueAsNumber: true })}
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="12.0"
        />
        {errors.interestRate && (
          <p className="mt-1 text-sm text-red-600">{errors.interestRate.message}</p>
        )}
      </div>

      {/* Term */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loan Term (Months)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <select
            {...register('termInMonths', { valueAsNumber: true })}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={12}>12 months</option>
            <option value={18}>18 months</option>
            <option value={24}>24 months</option>
            <option value={36}>36 months</option>
            <option value={48}>48 months</option>
            <option value={60}>60 months</option>
          </select>
        </div>
        {errors.termInMonths && (
          <p className="mt-1 text-sm text-red-600">{errors.termInMonths.message}</p>
        )}
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loan Purpose
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Target className="h-5 w-5 text-gray-400" />
          </div>
          <select
            {...register('purpose')}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select purpose</option>
            {loanPurposes.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </div>
        {errors.purpose && (
          <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
        )}
      </div>

      {/* Loan Calculator */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Payment Calculator</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-700">Monthly Payment</p>
            <p className="text-2xl font-bold text-blue-900">
              ${monthlyPayment.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Total Payment</p>
            <p className="text-2xl font-bold text-blue-900">
              ${totalPayment.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4 text-xs text-blue-600">
          Total interest: ${(totalPayment - watchedValues.amount).toFixed(2)}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Information</h2>
        <p className="text-gray-600">Help us assess your ability to repay</p>
      </div>

      {/* Monthly Income */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Income
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            {...register('monthlyIncome', { valueAsNumber: true })}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5000"
          />
        </div>
        {errors.monthlyIncome && (
          <p className="mt-1 text-sm text-red-600">{errors.monthlyIncome.message}</p>
        )}
      </div>

      {/* Monthly Expenses */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Expenses
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            {...register('monthlyExpenses', { valueAsNumber: true })}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="2000"
          />
        </div>
        {errors.monthlyExpenses && (
          <p className="mt-1 text-sm text-red-600">{errors.monthlyExpenses.message}</p>
        )}
      </div>

      {/* Employment Years */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Years of Employment
        </label>
        <input
          type="number"
          step="0.5"
          {...register('employmentYears', { valueAsNumber: true })}
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="3"
        />
        {errors.employmentYears && (
          <p className="mt-1 text-sm text-red-600">{errors.employmentYears.message}</p>
        )}
      </div>

      {/* Credit History */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Credit History
        </label>
        <select
          {...register('creditHistory')}
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select your credit history</option>
          {creditHistoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.creditHistory && (
          <p className="mt-1 text-sm text-red-600">{errors.creditHistory.message}</p>
        )}
      </div>

      {/* Debt-to-Income Ratio */}
      {watchedValues.monthlyIncome > 0 && watchedValues.monthlyExpenses >= 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Debt-to-Income Ratio</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  (watchedValues.monthlyExpenses / watchedValues.monthlyIncome) * 100 < 30
                    ? 'bg-green-500'
                    : (watchedValues.monthlyExpenses / watchedValues.monthlyIncome) * 100 < 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min((watchedValues.monthlyExpenses / watchedValues.monthlyIncome) * 100, 100)}%`
                }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {((watchedValues.monthlyExpenses / watchedValues.monthlyIncome) * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            A lower debt-to-income ratio improves your chances of loan approval
          </p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
        <p className="text-gray-600">Please review your loan application</p>
      </div>

      {/* Loan Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">${watchedValues.amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Interest Rate:</span>
              <span className="font-medium">{watchedValues.interestRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Term:</span>
              <span className="font-medium">{watchedValues.termInMonths} months</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Payment:</span>
              <span className="font-medium">${monthlyPayment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Payment:</span>
              <span className="font-medium">${totalPayment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Purpose:</span>
              <span className="font-medium">{watchedValues.purpose}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      {riskAssessment && (
        <div className={`rounded-lg border p-6 ${
          riskAssessment.approved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2 mb-3">
            {riskAssessment.approved ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <h3 className={`text-lg font-semibold ${
              riskAssessment.approved ? 'text-green-900' : 'text-red-900'
            }`}>
              Risk Assessment
            </h3>
          </div>
          <p className={`text-sm ${
            riskAssessment.approved ? 'text-green-700' : 'text-red-700'
          }`}>
            {riskAssessment.approved 
              ? 'Your application meets our lending criteria'
              : 'Your application needs additional review'
            }
          </p>
          {riskAssessment.recommendedRate && (
            <p className="text-sm text-gray-600 mt-2">
              Recommended interest rate: {(riskAssessment.recommendedRate / 100).toFixed(2)}%
            </p>
          )}
        </div>
      )}

      {/* Credit Score Display */}
      {creditScore && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Credit Score</h3>
          <div className="flex items-center space-x-4">
            <div className="text-3xl font-bold text-blue-700">{creditScore}</div>
            <div className="flex-1">
              <div className="bg-blue-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(creditScore / 850) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-blue-600 mt-1">
                <span>300</span>
                <span>850</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connection Check */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Please connect your wallet to submit the loan application
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-600">
          Your loan application has been submitted successfully and is now being processed.
        </p>
      </div>
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">What's Next?</h3>
        <div className="text-left space-y-2 text-sm text-blue-800">
          <p>• Your application will be reviewed by our risk assessment system</p>
          <p>• If approved, your loan will be listed for funding by lenders</p>
          <p>• You'll receive notifications about funding progress</p>
          <p>• Once fully funded, you can withdraw the loan amount</p>
        </div>
      </div>
      <button
        onClick={() => {
          setStep(1);
          reset();
          setRiskAssessment(null);
        }}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Apply for Another Loan
      </button>
    </div>
  );

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      {step < 4 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(submitLoanApplication)}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between items-center mt-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !isConnected}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Application</span>
                )}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default LoanApplication;