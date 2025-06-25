import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Plus, FileText, TrendingUp, Clock } from 'lucide-react';
import BorrowerDashboard from '../components/Borrower/BorrowerDashboard';
import LoanApplication from '../components/Borrower/LoanApplication';

const BorrowerPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { isConnected } = useSelector((state) => state.blockchain);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is a borrower
  if (user?.userType !== 'borrower' && user?.userType !== 'both') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Borrower Access Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be registered as a borrower to access this page.
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
      description: 'Overview of your loans and financial status'
    },
    {
      id: 'apply',
      name: 'Apply for Loan',
      icon: Plus,
      description: 'Submit a new loan application'
    }
  ];

  const quickStats = [
    {
      label: 'Active Loans',
      value: '2',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      label: 'Total Borrowed',
      value: '$15,000',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      label: 'Next Payment',
      value: '5 days',
      icon: Clock,
      color: 'text-orange-600'
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
                  Welcome back, {user?.firstName || 'Borrower'}!
                </h1>
                <p className="text-gray-600">
                  Manage your loans and track your financial progress
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
                      <FileText className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Connect Your Wallet
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Please connect your wallet to view your loan details and make transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <BorrowerDashboard />
          </div>
        )}

        {activeTab === 'apply' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Apply for a New Loan
                </h2>
                <p className="text-gray-600">
                  Fill out the application form to request funding from our lending community.
                </p>
              </div>
              
              <LoanApplication />
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Loan Requirements
              </h3>
              <p className="text-gray-600 text-sm">
                Learn about our loan requirements and how to improve your approval chances.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Credit Building
              </h3>
              <p className="text-gray-600 text-sm">
                Tips and strategies to build and improve your credit score on our platform.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Payment Support
              </h3>
              <p className="text-gray-600 text-sm">
                Get help with payments, schedules, and managing your loan obligations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowerPage;