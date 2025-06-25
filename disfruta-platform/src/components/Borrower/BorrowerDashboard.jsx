import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  CreditCard, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  FileText,
  Wallet,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { blockchainService } from '../../services/blockchain';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const BorrowerDashboard = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBorrowed: 0,
    activeLoans: 0,
    totalRepaid: 0,
    creditScore: 0
  });

  const { user } = useSelector((state) => state.auth);
  const { isConnected, account } = useSelector((state) => state.blockchain);

  useEffect(() => {
    if (isConnected && account) {
      loadDashboardData();
    }
  }, [isConnected, account]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLoans(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const borrowerLoans = await blockchainService.getBorrowerLoans(account);
      setLoans(borrowerLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
    }
  };

  const loadStats = async () => {
    try {
      const userStats = await apiService.getUserStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const makePayment = async (loanAddress, amount) => {
    try {
      const txHash = await blockchainService.makePayment(loanAddress, amount);
      toast.success('Payment submitted successfully!');
      toast.info(`Transaction Hash: ${txHash}`);
      await loadDashboardData();
    } catch (error) {
      console.error('Payment error:', error);
      if (error.code === 4001) {
        toast.error('Payment cancelled by user');
      } else {
        toast.error('Payment failed. Please try again.');
      }
    }
  };

  const withdrawFunds = async (loanAddress) => {
    try {
      const txHash = await blockchainService.withdrawLoanFunds(loanAddress);
      toast.success('Funds withdrawn successfully!');
      toast.info(`Transaction Hash: ${txHash}`);
      await loadDashboardData();
    } catch (error) {
      console.error('Withdrawal error:', error);
      if (error.code === 4001) {
        toast.error('Withdrawal cancelled by user');
      } else {
        toast.error('Withdrawal failed. Please try again.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-blue-600 bg-blue-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'repaid': return 'text-gray-600 bg-gray-100';
      case 'defaulted': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <TrendingUp className="w-4 h-4" />;
      case 'repaid': return <CheckCircle className="w-4 h-4" />;
      case 'defaulted': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view your borrower dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Borrower Dashboard</h1>
          <p className="text-gray-600">Manage your loans and track repayments</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Borrowed</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalBorrowed.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLoans}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Repaid</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalRepaid.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credit Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.creditScore}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Loans</h2>
        </div>

        {loans.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No loans yet</h3>
            <p className="text-gray-600 mb-6">Start by applying for your first loan</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Apply for Loan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loans.map((loan, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {loan.purpose || 'General Purpose'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {loan.interestRate}% • {loan.termInMonths} months
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        ${loan.principal?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Monthly: ${loan.monthlyPayment?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                        {getStatusIcon(loan.status)}
                        <span className="capitalize">{loan.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(loan.totalRepaid / loan.totalOwed) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {((loan.totalRepaid / loan.totalOwed) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {loan.status === 'active' && (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            ${loan.monthlyPayment?.toLocaleString()}
                          </div>
                          <div className="text-gray-500">
                            Due: {loan.nextPaymentDate}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {loan.status === 'approved' && loan.fundingProgress === 100 && (
                          <button
                            onClick={() => withdrawFunds(loan.address)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Withdraw
                          </button>
                        )}
                        {loan.status === 'active' && (
                          <button
                            onClick={() => makePayment(loan.address, loan.monthlyPayment)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Pay Now
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-700">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Apply for New Loan</h3>
          <p className="text-blue-100 mb-4">Need additional funding? Apply for another loan.</p>
          <button className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            Get Started
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Improve Credit Score</h3>
          <p className="text-green-100 mb-4">Learn how to improve your creditworthiness.</p>
          <button className="bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
            Learn More
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Payment History</h3>
          <p className="text-purple-100 mb-4">View detailed payment history and statements.</p>
          <button className="bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors">
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default BorrowerDashboard;