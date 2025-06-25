import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Search,
  Filter,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  Shield,
  Star,
  Eye,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { blockchainService } from '../../services/blockchain';
import { creditService } from '../../services/creditService';
import toast from 'react-hot-toast';

const InvestmentOpportunities = () => {
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minAmount: '',
    maxAmount: '',
    minRate: '',
    maxRate: '',
    maxTerm: '',
    riskLevel: '',
    purpose: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const { isConnected, account } = useSelector((state) => state.blockchain);

  useEffect(() => {
    loadAvailableLoans();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [loans, filters, searchTerm, sortBy]);

  const loadAvailableLoans = async () => {
    setLoading(true);
    try {
      const availableLoans = await blockchainService.getAvailableLoans();
      setLoans(availableLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
      toast.error('Failed to load investment opportunities');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...loans];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(loan => 
        loan.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.borrowerInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.minAmount) {
      filtered = filtered.filter(loan => loan.principal >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(loan => loan.principal <= parseFloat(filters.maxAmount));
    }
    if (filters.minRate) {
      filtered = filtered.filter(loan => loan.interestRate >= parseFloat(filters.minRate));
    }
    if (filters.maxRate) {
      filtered = filtered.filter(loan => loan.interestRate <= parseFloat(filters.maxRate));
    }
    if (filters.maxTerm) {
      filtered = filtered.filter(loan => loan.termInMonths <= parseInt(filters.maxTerm));
    }
    if (filters.riskLevel) {
      filtered = filtered.filter(loan => loan.riskLevel === filters.riskLevel);
    }
    if (filters.purpose) {
      filtered = filtered.filter(loan => loan.purpose === filters.purpose);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'amount_high':
        filtered.sort((a, b) => b.principal - a.principal);
        break;
      case 'amount_low':
        filtered.sort((a, b) => a.principal - b.principal);
        break;
      case 'rate_high':
        filtered.sort((a, b) => b.interestRate - a.interestRate);
        break;
      case 'rate_low':
        filtered.sort((a, b) => a.interestRate - b.interestRate);
        break;
      case 'term_short':
        filtered.sort((a, b) => a.termInMonths - b.termInMonths);
        break;
      default:
        break;
    }

    setFilteredLoans(filtered);
  };

  const investInLoan = async (loanAddress, amount) => {
    try {
      const txHash = await blockchainService.investInLoan(loanAddress, amount);
      toast.success('Investment successful!');
      toast.info(`Transaction Hash: ${txHash}`);
      await loadAvailableLoans();
    } catch (error) {
      console.error('Investment error:', error);
      if (error.code === 4001) {
        toast.error('Investment cancelled by user');
      } else {
        toast.error('Investment failed. Please try again.');
      }
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskStars = (riskLevel) => {
    const levels = { low: 1, medium: 2, high: 3 };
    const stars = levels[riskLevel] || 0;
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
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
          <h1 className="text-3xl font-bold text-gray-900">Investment Opportunities</h1>
          <p className="text-gray-600">Discover and invest in verified loans</p>
        </div>
        <button
          onClick={loadAvailableLoans}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by purpose or borrower..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest</option>
              <option value="amount_high">Amount (High to Low)</option>
              <option value="amount_low">Amount (Low to High)</option>
              <option value="rate_high">Rate (High to Low)</option>
              <option value="rate_low">Rate (Low to High)</option>
              <option value="term_short">Shortest Term</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-4">
          <input
            type="number"
            placeholder="Min Amount"
            value={filters.minAmount}
            onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <input
            type="number"
            placeholder="Max Amount"
            value={filters.maxAmount}
            onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <input
            type="number"
            placeholder="Min Rate %"
            value={filters.minRate}
            onChange={(e) => setFilters({...filters, minRate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <input
            type="number"
            placeholder="Max Rate %"
            value={filters.maxRate}
            onChange={(e) => setFilters({...filters, maxRate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <input
            type="number"
            placeholder="Max Term"
            value={filters.maxTerm}
            onChange={(e) => setFilters({...filters, maxTerm: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
          <select
            value={filters.purpose}
            onChange={(e) => setFilters({...filters, purpose: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Purposes</option>
            <option value="Business expansion">Business</option>
            <option value="Debt consolidation">Debt Consolidation</option>
            <option value="Home improvement">Home Improvement</option>
            <option value="Education">Education</option>
            <option value="Medical expenses">Medical</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Showing {filteredLoans.length} of {loans.length} opportunities
        </p>
      </div>

      {/* Loan Cards */}
      {filteredLoans.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities found</h3>
          <p className="text-gray-600">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map((loan, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {loan.purpose || 'General Purpose'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {loan.borrowerInfo?.creditScore && `Credit Score: ${loan.borrowerInfo.creditScore}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getRiskStars(loan.riskLevel)}
                  </div>
                </div>

                {/* Loan Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">${loan.principal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-semibold text-green-600">{loan.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Term:</span>
                    <span className="font-semibold">{loan.termInMonths} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(loan.riskLevel)}`}>
                      {loan.riskLevel?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Funding Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Funding Progress</span>
                    <span className="font-medium">{loan.fundingProgress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${loan.fundingProgress || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>${loan.totalFunded?.toLocaleString() || 0} funded</span>
                    <span>{loan.lendersCount || 0} lenders</span>
                  </div>
                </div>

                {/* Estimated Returns */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Estimated Returns</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Monthly Return:</p>
                      <p className="font-semibold text-blue-900">
                        ${((loan.principal * loan.interestRate / 100) / 12).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700">Total Return:</p>
                      <p className="font-semibold text-blue-900">
                        ${((loan.principal * loan.interestRate / 100) * (loan.termInMonths / 12)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const amount = prompt('Enter investment amount:');
                      if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                        investInLoan(loan.address, parseFloat(amount));
                      }
                    }}
                    disabled={!isConnected}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Invest</span>
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Funding Deadline */}
                {loan.fundingDeadline && (
                  <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Funding deadline: {new Date(loan.fundingDeadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-sm">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Connect your wallet to start investing
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentOpportunities;