const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Loan = require('../models/Loan');

class TestUtils {
  static mongod = null;

  static async setupTestDB() {
    this.mongod = await MongoMemoryServer.create();
    const uri = this.mongod.getUri();
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Test database connected');
  }

  static async teardownTestDB() {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (this.mongod) {
      await this.mongod.stop();
    }
    
    console.log('✅ Test database disconnected');
  }

  static async clearDatabase() {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }

  static async createTestUser(userData = {}) {
    const defaultUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'borrower',
      isVerified: true
    };

    const user = new User({ ...defaultUser, ...userData });
    
    if (!userData.password || userData.password === defaultUser.password) {
      user.password = await bcrypt.hash(defaultUser.password, 12);
    } else {
      user.password = await bcrypt.hash(userData.password, 12);
    }
    
    return await user.save();
  }

  static async createTestLoan(borrowerId, loanData = {}) {
    const defaultLoan = {
      amount: 1000,
      interestRate: 5,
      duration: 12,
      description: 'Test loan',
      status: 'pending'
    };

    const loan = new Loan({
      ...defaultLoan,
      ...loanData,
      borrower: borrowerId
    });

    return await loan.save();
  }

  static generateTestToken(userId, userRole = 'borrower') {
    return jwt.sign(
      { userId, role: userRole },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }

  static async createAuthenticatedRequest(app, userData = {}) {
    const user = await this.createTestUser(userData);
    const token = this.generateTestToken(user._id, user.role);
    
    return {
      user,
      token,
      request: require('supertest')(app).set('Authorization', `Bearer ${token}`)
    };
  }

  static async seedDemoAccounts() {
    const demoAccounts = [
      {
        name: 'Demo Borrower',
        email: 'borrower@demo.com',
        password: 'demo123',
        role: 'borrower',
        isVerified: true
      },
      {
        name: 'Demo Lender',
        email: 'lender@demo.com', 
        password: 'demo123',
        role: 'lender',
        isVerified: true
      },
      {
        name: 'Demo Admin',
        email: 'admin@demo.com',
        password: 'admin123', 
        role: 'admin',
        isVerified: true
      }
    ];

    const createdAccounts = [];
    for (const account of demoAccounts) {
      const existing = await User.findOne({ email: account.email });
      if (!existing) {
        const user = await this.createTestUser(account);
        createdAccounts.push(user);
        console.log(`✅ Demo account created: ${account.email}`);
      }
    }

    return createdAccounts;
  }
}

// Global test setup
beforeAll(async () => {
  await TestUtils.setupTestDB();
});

afterAll(async () => {
  await TestUtils.teardownTestDB();
});

beforeEach(async () => {
  await TestUtils.clearDatabase();
});

module.exports = { TestUtils };