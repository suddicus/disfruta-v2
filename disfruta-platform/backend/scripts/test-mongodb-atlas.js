#!/usr/bin/env node

/**
 * MongoDB Atlas Connection Test Script
 * Run this script to test your MongoDB Atlas connection
 * Usage: node scripts/test-mongodb-atlas.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  console.log('🧪 MongoDB Atlas Connection Test');
  console.log('================================');
  
  const mongoURI = process.env.MONGO_URI;
  
  if (!mongoURI) {
    console.log('❌ MONGO_URI not found in environment variables');
    console.log('💡 Please set MONGO_URI in your .env file');
    process.exit(1);
  }
  
  // Mask password in URL for logging
  const maskedURI = mongoURI.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
  console.log(`🔗 Testing connection to: ${maskedURI}`);
  
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Atlas Connection Successful!');
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`📡 Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Test basic database operations
    console.log('\n🧪 Testing Database Operations...');
    
    // Create a test collection
    const TestModel = mongoose.model('ConnectionTest', new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    // Insert test document
    console.log('📝 Inserting test document...');
    const testDoc = await TestModel.create({
      message: 'MongoDB Atlas connection test successful!'
    });
    console.log(`✅ Document inserted with ID: ${testDoc._id}`);
    
    // Read test document
    console.log('📖 Reading test document...');
    const foundDoc = await TestModel.findById(testDoc._id);
    console.log(`✅ Document found: ${foundDoc.message}`);
    
    // Clean up test document
    console.log('🧹 Cleaning up test document...');
    await TestModel.findByIdAndDelete(testDoc._id);
    console.log('✅ Test document cleaned up');
    
    console.log('\n🎉 All tests passed! MongoDB Atlas is ready for production.');
    
  } catch (error) {
    console.log('❌ MongoDB Atlas Connection Failed!');
    console.log(`🔍 Error: ${error.message}`);
    
    // Provide specific error guidance
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication Error Solutions:');
      console.log('   - Check your username and password in the connection string');
      console.log('   - Ensure the database user has proper permissions');
      console.log('   - Verify the database user exists in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n💡 Network Error Solutions:');
      console.log('   - Check your internet connection');
      console.log('   - Verify the cluster URL in your connection string');
      console.log('   - Ensure your IP is whitelisted in MongoDB Atlas Network Access');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout Error Solutions:');
      console.log('   - Check your network connectivity');
      console.log('   - Verify MongoDB Atlas cluster is running');
      console.log('   - Try connecting from a different network');
    }
    
    console.log('\n📋 Checklist:');
    console.log('   □ MongoDB Atlas cluster is created and running');
    console.log('   □ Database user is created with read/write permissions');
    console.log('   □ IP address is whitelisted (or 0.0.0.0/0 for testing)');
    console.log('   □ Connection string format is correct');
    console.log('   □ Username and password are correct in connection string');
    
    process.exit(1);
  } finally {
    // Always close the connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
};

// Run the test
testConnection().catch(console.error);