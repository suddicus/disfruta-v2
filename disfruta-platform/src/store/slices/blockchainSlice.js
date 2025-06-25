import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConnected: false,
  account: null,
  balance: '0',
  networkId: null,
  isLoading: false,
  error: null,
};

const blockchainSlice = createSlice({
  name: 'blockchain',
  initialState,
  reducers: {
    connectWallet: (state, action) => {
      state.isConnected = true;
      state.account = action.payload.account;
      state.balance = action.payload.balance;
      state.networkId = action.payload.networkId;
      state.error = null;
    },
    disconnectWallet: (state) => {
      state.isConnected = false;
      state.account = null;
      state.balance = '0';
      state.networkId = null;
      state.error = null;
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
    updateAccount: (state, action) => {
      state.account = action.payload;
    },
    updateNetworkId: (state, action) => {
      state.networkId = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  connectWallet,
  disconnectWallet,
  updateBalance,
  updateAccount,
  updateNetworkId,
  setLoading,
  setError,
  clearError,
} = blockchainSlice.actions;

export default blockchainSlice.reducer;