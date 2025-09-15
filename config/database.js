const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://shreevignahartaonline:Rohit2511@cluster01.jxogrv2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01';
    
    const conn = await mongoose.connect(mongoURI);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      // MongoDB disconnected
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error; // Re-throw the error so it can be caught by the caller
  }
};

module.exports = connectDB;
