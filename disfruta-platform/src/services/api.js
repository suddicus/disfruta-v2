// API Service for backend communication
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    this.timeout = 10000;
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // User profile endpoints
  async getUserProfile(userId) {
    return this.request(`/users/${userId}`);
  }

  async updateUserProfile(userId, updateData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async uploadKYCDocuments(userId, formData) {
    return this.request(`/users/${userId}/kyc`, {
      method: 'POST',
      headers: {}, // Let browser set content-type for FormData
      body: formData,
    });
  }

  // Loan endpoints
  async createLoanApplication(loanData) {
    return this.request('/loans', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
  }

  async getLoanDetails(loanId) {
    return this.request(`/loans/${loanId}`);
  }

  async getUserLoans(userId) {
    return this.request(`/users/${userId}/loans`);
  }

  async getAvailableLoans(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/loans/available${queryParams ? `?${queryParams}` : ''}`);
  }

  async updateLoanStatus(loanId, status) {
    return this.request(`/loans/${loanId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Investment endpoints
  async createInvestment(investmentData) {
    return this.request('/investments', {
      method: 'POST',
      body: JSON.stringify(investmentData),
    });
  }

  async getUserInvestments(userId) {
    return this.request(`/users/${userId}/investments`);
  }

  async getInvestmentDetails(investmentId) {
    return this.request(`/investments/${investmentId}`);
  }

  // Statistics endpoints
  async getUserStats(userId) {
    return this.request(`/users/${userId}/stats`);
  }

  async getLenderStats(userId) {
    return this.request(`/users/${userId}/lender-stats`);
  }

  async getPortfolioData(userId) {
    return this.request(`/users/${userId}/portfolio`);
  }

  async getPlatformStats() {
    return this.request('/stats/platform');
  }

  // Credit scoring endpoints
  async getCreditScore(userId) {
    return this.request(`/users/${userId}/credit-score`);
  }

  async updateCreditScore(userId, scoreData) {
    return this.request(`/users/${userId}/credit-score`, {
      method: 'PUT',
      body: JSON.stringify(scoreData),
    });
  }

  // Payment endpoints
  async recordPayment(paymentData) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentHistory(userId) {
    return this.request(`/users/${userId}/payments`);
  }

  // Notification endpoints
  async getNotifications(userId) {
    return this.request(`/users/${userId}/notifications`);
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // Admin endpoints
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async approveLoan(loanId) {
    return this.request(`/admin/loans/${loanId}/approve`, {
      method: 'POST',
    });
  }

  async rejectLoan(loanId, reason) {
    return this.request(`/admin/loans/${loanId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // File upload helper
  async uploadFile(file, path) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    return this.request('/upload', {
      method: 'POST',
      headers: {}, // Let browser set content-type for FormData
      body: formData,
    });
  }
}

export const apiService = new ApiService();