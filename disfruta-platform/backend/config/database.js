const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI; // || 'mongodb://localhost:27017/disfruta';
    
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URI: ${mongoURI.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@')}`);
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    });
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}:${conn.connection.port}`);
    console.log(`📡 Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    return conn;
  } catch (error) {
    console.log('❌ MongoDB connection failed!');
    console.log('🔍 Error Details:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 Possible solutions:');
      console.log('   - Check if MongoDB Atlas cluster is running');
      console.log('   - Verify connection string format');
      console.log('   - Check network access settings in MongoDB Atlas');
      console.log('   - Ensure IP address is whitelisted');
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🚨 Production mode: Exiting due to database connection failure');
      process.exit(1);
    } else {
      console.log('⚠️  Development mode: Continuing without database');
      console.log('   - API endpoints may not work properly');
      console.log('   - Please set up MongoDB Atlas for full functionality');
    }
  }
};

module.exports = connectDB;
