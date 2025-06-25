const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// In-memory database for development/testing
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.initializeTestUsers();
  }

  async initializeTestUsers() {
    // Create test users
    const testUsers = [
      {
        _id: 'borrower123',
        name: 'Test Borrower',
        email: 'borrower@demo.com',
        password: 'demo123',
        userType: 'borrower',
        phone: '+1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'United States'
        },
        isVerified: true,
        isActive: true,
        kycStatus: 'verified',
        creditScore: 720,
        statistics: {
          totalLoaned: 0,
          totalBorrowed: 15000,
          totalInvested: 0,
          totalEarned: 0,
          activeLoans: 1,
          completedLoans: 2,
          defaultedLoans: 0
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          riskTolerance: 'medium'
        },
        loginAttempts: 0,
        createdAt: new Date('2024-01-01'),
        lastLogin: null
      },
      {
        _id: 'lender123',
        name: 'Test Lender',
        email: 'lender@demo.com',
        password: 'demo123',
        userType: 'lender',
        phone: '+1234567891',
        address: {
          street: '456 Lender Ave',
          city: 'Lend City',
          state: 'LS',
          zipCode: '54321',
          country: 'United States'
        },
        isVerified: true,
        isActive: true,
        kycStatus: 'verified',
        creditScore: 780,
        statistics: {
          totalLoaned: 50000,
          totalBorrowed: 0,
          totalInvested: 75000,
          totalEarned: 3500,
          activeLoans: 3,
          completedLoans: 12,
          defaultedLoans: 0
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          riskTolerance: 'low'
        },
        loginAttempts: 0,
        createdAt: new Date('2024-01-01'),
        lastLogin: null
      }
    ];

    // Hash passwords and store users
    for (const userData of testUsers) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
      this.users.set(userData.email, userData);
    }
  }

  // User operations
  async findOne(query) {
    if (query.email) {
      const user = this.users.get(query.email.toLowerCase());
      if (user) {
        return {
          ...user,
          matchPassword: async function(password) {
            return await bcrypt.compare(password, this.password);
          },
          incLoginAttempts: async function() {
            this.loginAttempts += 1;
            if (this.loginAttempts >= 5) {
              this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
            }
          },
          resetLoginAttempts: async function() {
            this.loginAttempts = 0;
            this.lockUntil = undefined;
          },
          save: async function() {
            return this;
          },
          get isLocked() {
            return !!(this.lockUntil && this.lockUntil > Date.now());
          }
        };
      }
    }
    return null;
  }

  async findById(id) {
    for (const user of this.users.values()) {
      if (user._id === id) {
        return {
          ...user,
          save: async function() {
            return this;
          }
        };
      }
    }
    return null;
  }

  async create(userData) {
    const userId = crypto.randomBytes(12).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const newUser = {
      _id: userId,
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      userType: userData.userType,
      phone: userData.phone || '',
      address: userData.address || {},
      isVerified: false,
      isActive: true,
      kycStatus: 'pending',
      creditScore: 650,
      statistics: {
        totalLoaned: 0,
        totalBorrowed: 0,
        totalInvested: 0,
        totalEarned: 0,
        activeLoans: 0,
        completedLoans: 0,
        defaultedLoans: 0
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        riskTolerance: 'medium'
      },
      emailVerificationToken: userData.emailVerificationToken,
      emailVerificationExpire: userData.emailVerificationExpire,
      loginAttempts: 0,
      createdAt: new Date(),
      lastLogin: null,
      save: async function() {
        return this;
      }
    };

    this.users.set(newUser.email, newUser);
    return newUser;
  }
}

// Export singleton instance
module.exports = new MockDatabase();
