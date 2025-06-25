import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import loanReducer from './slices/loanSlice';
import blockchainReducer from './slices/blockchainSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    loans: loanReducer,
    blockchain: blockchainReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['blockchain/connectWallet', 'blockchain/updateBalance'],
      },
    }),
});

// TypeScript types (commented out for JavaScript project)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;