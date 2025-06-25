import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, Check, AlertCircle, Loader } from 'lucide-react';
import { connectWallet, disconnectWallet, updateBalance } from '../../store/slices/blockchainSlice';
import { blockchainService } from '../../services/blockchain';
import toast from 'react-hot-toast';

const WalletConnector = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const dispatch = useDispatch();
  const { isConnected, account, balance, networkId } = useSelector((state) => state.blockchain);

  const supportedNetworks = {
    1337: 'Localhost',
    80001: 'Mumbai Testnet',
    137: 'Polygon Mainnet',
  };

  useEffect(() => {
    // Check if wallet is already connected on component mount
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  useEffect(() => {
    // Update balance periodically when connected
    let intervalId;
    if (isConnected && account) {
      updateWalletBalance();
      intervalId = setInterval(updateWalletBalance, 10000); // Update every 10 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isConnected, account]);

  const checkWalletConnection = async () => {
    try {
      const connected = await blockchainService.checkConnection();
      if (connected) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const networkId = await blockchainService.getNetworkId();
          const balance = await blockchainService.getBalance(accounts[0]);
          
          dispatch(connectWallet({
            account: accounts[0],
            networkId,
            balance,
          }));
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const updateWalletBalance = async () => {
    if (account) {
      try {
        const newBalance = await blockchainService.getBalance(account);
        dispatch(updateBalance(newBalance));
      } catch (error) {
        console.error('Error updating balance:', error);
      }
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      dispatch(disconnectWallet());
      toast.error('Wallet disconnected');
    } else if (accounts[0] !== account) {
      // Account changed
      window.location.reload(); // Refresh to reset app state
    }
  };

  const handleChainChanged = () => {
    // Refresh the page to reset app state when network changes
    window.location.reload();
  };

  const handleConnect = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      window.open('https://metamask.io/download.html', '_blank');
      return;
    }

    setIsConnecting(true);

    try {
      const connected = await blockchainService.connectWallet();
      
      if (connected) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const networkId = await blockchainService.getNetworkId();
        const balance = await blockchainService.getBalance(accounts[0]);

        dispatch(connectWallet({
          account: accounts[0],
          networkId,
          balance,
        }));

        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else if (error.code === -32002) {
        toast.error('Connection request already pending');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnectWallet());
    toast.success('Wallet disconnected');
  };

  const formatBalance = (balance) => {
    if (!balance) return '0.00';
    return parseFloat(balance).toFixed(4);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkStatus = () => {
    if (!networkId) return null;
    
    const networkName = supportedNetworks[networkId];
    const isSupported = !!networkName;
    
    return {
      name: networkName || 'Unknown Network',
      isSupported,
      color: isSupported ? 'text-green-600' : 'text-red-600',
      bgColor: isSupported ? 'bg-green-50' : 'bg-red-50',
    };
  };

  const switchNetwork = async (targetNetworkId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetNetworkId.toString(16)}` }],
      });
    } catch (error) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        toast.error('Please add this network to MetaMask first');
      } else {
        toast.error('Failed to switch network');
      }
    }
  };

  if (isConnected) {
    const networkStatus = getNetworkStatus();
    
    return (
      <div className="flex items-center space-x-3">
        {/* Network Status */}
        {networkStatus && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${networkStatus.bgColor} ${networkStatus.color}`}>
            {networkStatus.name}
            {!networkStatus.isSupported && (
              <button
                onClick={() => switchNetwork(1337)}
                className="ml-1 underline hover:no-underline"
              >
                Switch
              </button>
            )}
          </div>
        )}
        
        {/* Wallet Info */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
          <div className="flex items-center space-x-1">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">
              {formatAddress(account)}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            {formatBalance(balance)} ETH
          </div>
        </div>
        
        {/* Disconnect Button */}
        <button
          onClick={handleDisconnect}
          className="text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isConnecting ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
};

export default WalletConnector;