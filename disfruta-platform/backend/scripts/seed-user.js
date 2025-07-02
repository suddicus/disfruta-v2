// scripts/seed-users.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedTestUsers = async () => {
  try {
    // Check if test users already exist
    const existingUsers = await User.find({
      email: { $in: ['borrower@demo.com', 'lender@demo.com', 'admin@demo.com'] }
    });
    
    if (existingUsers.length === 0) {
      const testUsers = [
        {
          name: 'Demo Borrower',
          email: 'borrower@demo.com',
          password: await bcrypt.hash('demo123', 12),
          userType: 'borrower',
          isVerified: true,
          isActive: true
        },
        {
          name: 'Demo Lender', 
          email: 'lender@demo.com',
          password: await bcrypt.hash('demo123', 12),
          userType: 'lender',
          isVerified: true,
          isActive: true
        },
        {
          name: 'Admin User',
          email: 'admin@demo.com', 
          password: await bcrypt.hash('admin123', 12),
          userType: 'admin',
          isVerified: true,
          isActive: true
        }
      ];
      
      await User.insertMany(testUsers);
      console.log('✅ Test users created successfully');
    }
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  }
};