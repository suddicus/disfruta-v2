import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authAPI, loanAPI, userAPI } from '../../services/api';
import { mockFetch, mockApiResponses, resetMocks } from '../setup';

describe('API Services', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('Auth API', () => {
    describe('login', () => {
      it('should make POST request to login endpoint', async () => {
        mockFetch(mockApiResponses.login.success);
        
        const credentials = {
          email: 'test@example.com',
          password: 'password123'
        };
        
        const result = await authAPI.login(credentials);
        
        expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });
        
        expect(result).toEqual(mockApiResponses.login.success);
      });

      it('should handle login API errors', async () => {
        mockFetch(mockApiResponses.login.error, false);
        
        const credentials = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };
        
        await expect(authAPI.login(credentials)).rejects.toThrow('Invalid credentials');
      });
    });

    describe('register', () => {
      it('should make POST request to register endpoint', async () => {
        mockFetch(mockApiResponses.register.success);
        
        const userData = {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'borrower'
        };
        
        const result = await authAPI.register(userData);
        
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
        
        expect(result).toEqual(mockApiResponses.register.success);
      });
    });

    describe('logout', () => {
      it('should make POST request to logout endpoint', async () => {
        mockFetch({ message: 'Logged out successfully' });
        
        const result = await authAPI.logout();
        
        expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer null',
            'Content-Type': 'application/json',
          },
        });
        
        expect(result.message).toBe('Logged out successfully');
      });
    });
  });

  describe('Loan API', () => {
    describe('getLoans', () => {
      it('should fetch loans with proper authentication', async () => {
        mockFetch(mockApiResponses.loans.success);
        
        const result = await loanAPI.getLoans();
        
        expect(fetch).toHaveBeenCalledWith('/api/loans', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer null',
            'Content-Type': 'application/json',
          },
        });
        
        expect(result).toEqual(mockApiResponses.loans.success);
      });

      it('should handle pagination parameters', async () => {
        mockFetch(mockApiResponses.loans.success);
        
        const params = { page: 2, limit: 10, status: 'active' };
        await loanAPI.getLoans(params);
        
        const expectedUrl = '/api/loans?page=2&limit=10&status=active';
        expect(fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
      });
    });

    describe('createLoan', () => {
      it('should create loan with valid data', async () => {
        const loanData = {
          amount: 5000,
          interestRate: 8,
          duration: 24,
          description: 'Business expansion loan'
        };
        
        const createdLoan = { id: '2', ...loanData };
        mockFetch(createdLoan);
        
        const result = await loanAPI.createLoan(loanData);
        
        expect(fetch).toHaveBeenCalledWith('/api/loans', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer null',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loanData),
        });
        
        expect(result).toEqual(createdLoan);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      await expect(authAPI.login({})).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch({ message: 'Server error' }, false);
      
      await expect(loanAPI.getLoans()).rejects.toThrow('Server error');
    });
  });
});
