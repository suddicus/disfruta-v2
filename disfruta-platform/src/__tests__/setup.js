import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import authSlice from '../store/authSlice';
import loanSlice from '../store/loanSlice';

// Mock store setup
export const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      loans: loanSlice,
    },
    preloadedState: initialState,
  });
};

// Test wrapper component
export const TestWrapper = ({ children, initialState = {} }) => {
  const store = createMockStore(initialState);
  
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

// Mock API responses
export const mockApiResponses = {
  login: {
    success: {
      token: 'mock-jwt-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'borrower'
      }
    },
    error: {
      message: 'Invalid credentials'
    }
  },
  loans: {
    success: [
      {
        id: '1',
        amount: 1000,
        interestRate: 5,
        duration: 12,
        status: 'active',
        borrower: 'Test Borrower',
        description: 'Business loan for expansion'
      }
    ]
  },
  register: {
    success: {
      message: 'User registered successfully',
      user: {
        id: '2',
        email: 'newuser@example.com',
        name: 'New User'
      }
    }
  }
};

// Custom render function
export const renderWithProviders = (ui, options = {}) => {
  const { initialState = {}, ...renderOptions } = options;
  
  const Wrapper = ({ children }) => (
    <TestWrapper initialState={initialState}>{children}</TestWrapper>
  );
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock localStorage
export const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = vi.fn();

export const mockFetch = (response, ok = true) => {
  fetch.mockResolvedValue({
    ok,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};

export const resetMocks = () => {
  vi.clearAllMocks();
  mockLocalStorage.clear();
};
