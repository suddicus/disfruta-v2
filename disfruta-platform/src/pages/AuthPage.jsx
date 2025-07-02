import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';
import SignupForm from '../components/Auth/SignupForm';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Redirect if already authenticated
  if (isAuthenticated) {
    if (user?.userType === 'borrower') {
      console.log('seasons.auth borrower');
      return <Navigate to="/borrow" replace />;
    } else if (user?.userType === 'lender') {
      console.log('seasons.auth lender');
      return <Navigate to="/lend" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Disfruta</h1>
          <p className="text-gray-600 mt-2">Peer-to-Peer Lending Platform</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLogin ? (
            <LoginForm onToggleForm={toggleForm} />
          ) : (
            <SignupForm onToggleForm={toggleForm} />
          )}
        </div>
        
        {/* Additional Info */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Why Join Disfruta?</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• Transparent blockchain-based lending</p>
              <p>• Competitive interest rates</p>
              <p>• Fast loan processing</p>
              <p>• Global community of verified users</p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Your data is protected with bank-level security and encryption. 
            We comply with international financial regulations and privacy laws.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;