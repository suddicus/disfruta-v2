import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { blockchainService } from '../../services/blockchain';

// Async thunks
export const fetchUserLoans = createAsyncThunk(
  'loans/fetchUserLoans',
  async (userAddress, { rejectWithValue }) => {
    try {
      const loans = await blockchainService.getBorrowerLoans(userAddress);
      return loans;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAvailableLoans = createAsyncThunk(
  'loans/fetchAvailableLoans',
  async (_, { rejectWithValue }) => {
    try {
      const loans = await blockchainService.getAvailableLoans();
      return loans;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createLoan = createAsyncThunk(
  'loans/createLoan',
  async (loanData, { rejectWithValue }) => {
    try {
      const txHash = await blockchainService.createLoan(loanData);
      return { txHash, loanData };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const investInLoan = createAsyncThunk(
  'loans/investInLoan',
  async ({ loanAddress, amount }, { rejectWithValue }) => {
    try {
      const txHash = await blockchainService.investInLoan(loanAddress, amount);
      return { txHash, loanAddress, amount };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  userLoans: [],
  availableLoans: [],
  lenderInvestments: [],
  isLoading: false,
  error: null,
  filters: {
    minAmount: '',
    maxAmount: '',
    minRate: '',
    maxRate: '',
    maxTerm: '',
    riskLevel: '',
    purpose: '',
  },
  sortBy: 'newest',
};

const loanSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLoanStatus: (state, action) => {
      const { loanAddress, status } = action.payload;
      
      // Update in userLoans
      const userLoanIndex = state.userLoans.findIndex(loan => loan.address === loanAddress);
      if (userLoanIndex !== -1) {
        state.userLoans[userLoanIndex].status = status;
      }
      
      // Update in availableLoans
      const availableLoanIndex = state.availableLoans.findIndex(loan => loan.address === loanAddress);
      if (availableLoanIndex !== -1) {
        state.availableLoans[availableLoanIndex].status = status;
      }
    },
    updateLoanFunding: (state, action) => {
      const { loanAddress, totalFunded, fundingProgress } = action.payload;
      
      const loanIndex = state.availableLoans.findIndex(loan => loan.address === loanAddress);
      if (loanIndex !== -1) {
        state.availableLoans[loanIndex].totalFunded = totalFunded;
        state.availableLoans[loanIndex].fundingProgress = fundingProgress;
      }
    },
    addLenderInvestment: (state, action) => {
      state.lenderInvestments.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user loans
      .addCase(fetchUserLoans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userLoans = action.payload;
      })
      .addCase(fetchUserLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch available loans
      .addCase(fetchAvailableLoans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableLoans = action.payload;
      })
      .addCase(fetchAvailableLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create loan
      .addCase(createLoan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add the new loan to userLoans (will be updated when blockchain confirms)
      })
      .addCase(createLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Invest in loan
      .addCase(investInLoan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(investInLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        // Investment will be reflected when blockchain updates are fetched
      })
      .addCase(investInLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  setSortBy,
  clearError,
  updateLoanStatus,
  updateLoanFunding,
  addLenderInvestment,
} = loanSlice.actions;

export default loanSlice.reducer;