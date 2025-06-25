import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { renderWithProviders, mockFetch, mockApiResponses, resetMocks } from '../setup';

describe('Integration Tests', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('User Authentication Flow', () => {
    it('should complete full login flow', async () => {
      const user = userEvent.setup();
      mockFetch(mockApiResponses.login.success);
      
      renderWithProviders(<App />);
      
      // Navigate to login page
      const signInButton = screen.getByText('Sign In');
      await user.click(signInButton);
      
      // Fill and submit login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Verify successful login
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should handle logout flow', async () => {
      const user = userEvent.setup();
      const initialState = {
        auth: {
          isAuthenticated: true,
          user: { name: 'John Doe', email: 'john@example.com' }
        }
      };
      
      renderWithProviders(<App />, { initialState });
      
      // Open user menu and logout
      const userButton = screen.getByText('John Doe');
      await user.click(userButton);
      
      const logoutButton = screen.getByText('Logout');
      await user.click(logoutButton);
      
      // Verify logout
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
    });
  });

  describe('Loan Management Flow', () => {
    it('should display loans for authenticated user', async () => {
      mockFetch(mockApiResponses.loans.success);
      
      const initialState = {
        auth: {
          isAuthenticated: true,
          user: { name: 'John Doe', role: 'borrower' }
        }
      };
      
      renderWithProviders(<App />, { initialState });
      
      // Navigate to loans page
      const loansLink = screen.getByText('Loans');
      await userEvent.click(loansLink);
      
      // Verify loans are displayed
      await waitFor(() => {
        expect(screen.getByText('Business loan for expansion')).toBeInTheDocument();
      });
    });

    it('should create new loan', async () => {
      const user = userEvent.setup();
      const newLoan = { id: '2', amount: 2000, status: 'pending' };
      mockFetch(newLoan);
      
      const initialState = {
        auth: {
          isAuthenticated: true,
          user: { name: 'John Doe', role: 'borrower' }
        }
      };
      
      renderWithProviders(<App />, { initialState });
      
      // Navigate to create loan page
      const createButton = screen.getByText('Create Loan');
      await user.click(createButton);
      
      // Fill loan form
      const amountInput = screen.getByLabelText(/amount/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(amountInput, '2000');
      await user.type(descriptionInput, 'New business loan');
      await user.click(submitButton);
      
      // Verify loan creation
      await waitFor(() => {
        expect(screen.getByText('Loan created successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      mockFetch({ message: 'Server error' }, false);
      
      renderWithProviders(<App />);
      
      // Attempt login with server error
      const signInButton = screen.getByText('Sign In');
      await user.click(signInButton);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      fetch.mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<App />);
      
      // Attempt action with network error
      const signInButton = screen.getByText('Sign In');
      await user.click(signInButton);
      
      // Fill and submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Verify network error handling
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Integration', () => {
    it('should work on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<App />);
      
      // Verify mobile menu
      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
      expect(mobileMenuButton).toBeInTheDocument();
      
      await userEvent.click(mobileMenuButton);
      
      // Verify mobile navigation
      expect(screen.getByRole('navigation')).toHaveClass('mobile-menu-open');
    });
  });
});
