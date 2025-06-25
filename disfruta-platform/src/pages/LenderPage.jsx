import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Search, Eye, DollarSign } from 'lucide-react';
import LenderDashboard from '../components/Lender/LenderDashboard';
import InvestmentOpportunities from '../components/Lender/InvestmentOpportunities';

const LenderPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { isConnected } = useSelector((state) => state.blockchain);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is a lender
  if (user?.userType !== 'lender' && user?.userType !== 'both') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lender Access Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be registered as a lender to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: TrendingUp,
      description: 'Overview of your investments and returns'
    },
    {
      id: 'opportunities',
      name: 'Investment Opportunities',
      icon: Search,
      description: 'Browse and invest in available loans'
    }
  ];

  const quickStats = [
    {
      label: 'Total Invested',
      value: '$25,000',
      icon: DollarSign,
      color: 'text-blue-600'
    },
    {
      label: 'Active Investments',
      value: '8',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      label: 'Monthly Returns',
      value: '$312',
      icon: Eye,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.firstName || 'Lender'}!
                </h1>
                <p className="text-gray-600">
                  Manage your investments and discover new opportunities
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex space-x-6">
                {quickStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      <span className="text-lg font-semibold text-gray-900">
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-8">
        {activeTab === 'dashboard' && (
          <div>
            {/* Wallet Connection Status */}
            {!isConnected && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Connect Your Wallet
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Please connect your wallet to view your investments and make transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <LenderDashboard />
          </div>
        )}

        {activeTab === 'opportunities' && (
          <InvestmentOpportunities />
        )}
      </div>

      {/* Help Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Investment Strategy
              </h3>
              <p className="text-gray-600 text-sm">
                Learn how to diversify your portfolio and maximize returns on our platform.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Risk Management
              </h3>
              <p className="text-gray-600 text-sm">
                Understand risk levels and how to build a balanced lending portfolio.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Performance Tracking
              </h3>
              <p className="text-gray-600 text-sm">
                Monitor your investments and track performance across all your loans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LenderPage;