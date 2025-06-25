import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import { blockchainService } from './services/blockchain';

// Layout Components
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import AboutPage from './pages/AboutPage';
import BorrowerPage from './pages/BorrowerPage';
import LenderPage from './pages/LenderPage';

// Wallet Connector
import WalletConnector from './components/Common/WalletConnector';

function App() {
  useEffect(() => {
    // Initialize blockchain service
    const initializeBlockchain = async () => {
      try {
        await blockchainService.initialize();
      } catch (error) {
        console.error('Failed to initialize blockchain service:', error);
      }
    };

    initializeBlockchain();

    // Handle account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          window.location.reload();
        } else {
          // Account changed
          window.location.reload();
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        // Network changed
        window.location.reload();
      });
    }

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />

          {/* Header */}
          <Header />

          {/* Wallet Connector - Hidden component for wallet functionality */}
          <WalletConnector />

          {/* Main Content */}
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Protected Routes */}
              <Route path="/borrow/*" element={<BorrowerPage />} />
              <Route path="/lend/*" element={<LenderPage />} />

              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </Provider>
  );
}

export default App;