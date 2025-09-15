const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/database');
require('dotenv').config();

// Environment validation
const requiredEnvVars = [
  'MONGODB_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY', 
  'CLOUDINARY_API_SECRET',
];

const optionalEnvVars = [
  'WASENDER_API_KEY',
  'MAX_FILE_SIZE'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease update your .env file');
  process.exit(1);
}

// Log optional environment variables status
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptionalVars.length > 0) {
  console.warn('⚠️ Optional environment variables not set:');
  missingOptionalVars.forEach(varName => console.warn(`   - ${varName}`));
  console.warn('These features will be disabled until configured.\n');
}

// Check if uploads directory exists, create if not
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// MongoDB connection will be handled in startServer()

const uploadRoutes = require('./routes/upload');
const companyRoutes = require('./routes/company');
const itemRoutes = require('./routes/item');
const partyRoutes = require('./routes/party');
const saleRoutes = require('./routes/sale');
const purchaseRoutes = require('./routes/purchase');
const paymentRoutes = require('./routes/payment');
const Item = require('./models/Item');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());

// Configure logging - only log errors (4xx, 5xx)
app.use(morgan('combined', {
  skip: function (req, res) { 
    return res.statusCode < 400; // Only log 4xx and 5xx responses
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/upload', uploadRoutes);
app.use('/company', companyRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Vignaharta Billing Backend is running',
    timestamp: new Date().toISOString(),
    services: {
      upload: '/upload',
      upload_status: '/upload/status',
      whatsapp_send: '/upload/send-whatsapp',
      whatsapp_test: '/upload/test-whatsapp',
      company: '/company',
      items: '/api/items',
      parties: '/api/parties',
      parties_transactions: '/api/parties/:id/transactions',
      sales: '/api/sales',
      purchases: '/api/purchases',
      payments: '/api/payments'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize Bardana universal item on server startup
async function initializeBardana() {
  try {
    // Check if Bardana already exists
    const existingBardana = await Item.findOne({ 
      isUniversal: true, 
      productName: 'Bardana' 
    });
    
    if (!existingBardana) {
      // Create Bardana universal item
      const bardanaItem = new Item({
        productName: 'Bardana',
        category: 'Primary',
        purchasePrice: 0,
        salePrice: 0,
        openingStock: 0,
        asOfDate: new Date().toISOString().split('T')[0],
        lowStockAlert: 10,
        isUniversal: true
      });
      
      await bardanaItem.save();
    }
  } catch (error) {
    console.error('❌ Error initializing Bardana:', error);
  }
}

// Clean up duplicate payments on server startup
async function cleanupDuplicatePayments() {
  try {
    const Payment = require('./models/Payment');
    const result = await Payment.cleanupDuplicates();
    
    if (result.cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${result.cleanedCount} duplicate payments`);
    } else {
      console.log('✅ No duplicate payments found');
    }
  } catch (error) {
    console.error('❌ Error cleaning up duplicate payments:', error);
  }
}


// Start server
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await connectDB();
    
    console.log('✅ MongoDB connected successfully');

    // Initialize Bardana
    console.log('🔄 Initializing Bardana...');
    await initializeBardana();
    console.log('✅ Bardana initialized');

    // Clean up duplicate payments
    console.log('🔄 Cleaning up duplicate payments...');
    await cleanupDuplicatePayments();
    console.log('✅ Payment cleanup completed');

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please kill the process using this port or use a different port.`);
        console.error('💡 You can kill the process with: taskkill /PID <PID> /F');
        console.error('💡 Or change the PORT in your .env file');
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
