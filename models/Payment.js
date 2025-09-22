const mongoose = require('mongoose');

// Payment Schema - Clean implementation from scratch
const paymentSchema = new mongoose.Schema({
  // Payment identification
  paymentNo: {
    type: String,
    required: [true, 'Payment number is required'],
    unique: true,
    trim: true,
    index: true
  },
  
  // Payment type
  type: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: {
      values: ['payment-in', 'payment-out'],
      message: 'Payment type must be either payment-in or payment-out'
    },
    default: 'payment-in',
    index: true
  },
  
  // Party information
  partyName: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
    maxlength: [100, 'Party name cannot exceed 100 characters'],
    index: true
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Remove all non-digit characters except +
        const cleaned = v.replace(/[^\d+]/g, '');
        // Must start with + and have 10-15 digits
        return /^\+[1-9]\d{9,14}$/.test(cleaned);
      },
      message: 'Phone number must be in international format (+91xxxxxxxxxx)'
    },
    index: true
  },
  
  // Amount information
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  
  totalAmount: {
    type: Number,
    default: function() {
      return this.amount;
    },
    min: [0, 'Total amount cannot be negative']
  },
  
  // Date information
  date: {
    type: String,
    required: [true, 'Date is required'],
    validate: {
      validator: function(v) {
        // Accept MM/DD/YYYY format
        return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v);
      },
      message: 'Date must be in MM/DD/YYYY format'
    }
  },
  
  // Optional fields
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  
  paymentMethod: {
    type: String,
    enum: {
      values: ['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other'],
      message: 'Invalid payment method'
    },
    default: 'cash'
  },
  
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters'],
    default: ''
  },
  
  // Party reference
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for better query performance
paymentSchema.index({ type: 1, partyName: 1 });
paymentSchema.index({ type: 1, date: 1 });
paymentSchema.index({ partyName: 1, phoneNumber: 1 });
paymentSchema.index({ createdAt: -1 });

// Pre-save middleware for data sanitization
paymentSchema.pre('save', function(next) {
  // Sanitize phone number
  if (this.phoneNumber) {
    this.phoneNumber = this.phoneNumber.replace(/[^\d+]/g, '');
    if (!this.phoneNumber.startsWith('+')) {
      this.phoneNumber = '+91' + this.phoneNumber;
    }
  }
  
  // Ensure totalAmount is set
  if (!this.totalAmount && this.amount) {
    this.totalAmount = this.amount;
  }
  
  // Generate payment number if not set
  if (!this.paymentNo) {
    this.paymentNo = this.generatePaymentNumber();
  }
  
  next();
});

// Instance method to generate payment number
paymentSchema.methods.generatePaymentNumber = function() {
  const prefix = this.type === 'payment-in' ? 'PAY-IN' : 'PAY-OUT';
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// Instance method to get formatted details
paymentSchema.methods.getFormattedDetails = function() {
  return {
    id: this._id.toString(),
    paymentNo: this.paymentNo,
    type: this.type,
    partyName: this.partyName,
    phoneNumber: this.phoneNumber,
    amount: this.amount,
    totalAmount: this.totalAmount,
    date: this.date,
    description: this.description,
    paymentMethod: this.paymentMethod,
    reference: this.reference,
    partyId: this.partyId,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to generate unique payment number
paymentSchema.statics.generateUniquePaymentNumber = async function(type = 'payment-in') {
  const prefix = type === 'payment-in' ? 'PAY-IN' : 'PAY-OUT';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const paymentNo = `${prefix}-${timestamp}-${random}`;
    
    // Check if this payment number already exists
    const existing = await this.findOne({ paymentNo });
    if (!existing) {
      return paymentNo;
    }
    
    attempts++;
  }
  
  // Ultimate fallback
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `${prefix}-${timestamp}-${random}`;
};

// Static method to create payment with unique number
paymentSchema.statics.createPayment = async function(paymentData) {
  try {
    // Generate unique payment number
    const paymentNo = await this.generateUniquePaymentNumber(paymentData.type);
    
    // Create payment with unique number
    const payment = new this({
      ...paymentData,
      paymentNo
    });
    
    await payment.save();
    return payment;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

// Static method to get payments by type
paymentSchema.statics.getPaymentsByType = async function(type, options = {}) {
  const filter = { type };
  
  if (options.partyName) {
    filter.partyName = { $regex: options.partyName, $options: 'i' };
  }
  
  if (options.phoneNumber) {
    filter.phoneNumber = options.phoneNumber;
  }
  
  if (options.startDate && options.endDate) {
    filter.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  return this.find(filter)
    .populate('partyId', 'name phoneNumber balance')
    .sort({ createdAt: -1 });
};

// Static method to get payment summary
paymentSchema.statics.getPaymentSummary = async function(type = null, startDate = null, endDate = null) {
  const filter = {};
  
  if (type) {
    filter.type = type;
  }
  
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        totalCount: { $sum: 1 }
      }
    }
  ]);
};

// Static method to update party balance
paymentSchema.statics.updatePartyBalance = async function(payment) {
  try {
    const Party = require('./Party');
    
    if (!payment.partyId) {
      return;
    }
    
    // For payment-in: subtract amount (money coming into business)
    // For payment-out: add amount (money going out of business)
    let operation;
    if (payment.type === 'payment-in') {
      operation = 'subtract'; // Money coming in, reduce party balance
    } else if (payment.type === 'payment-out') {
      operation = 'add'; // Money going out, increase party balance
    }
    
    await Party.updateBalance(payment.partyId, payment.amount, operation);
  } catch (error) {
    console.error('Error updating party balance:', error);
    throw error;
  }
};

// Static method to clean up duplicate payments
paymentSchema.statics.cleanupDuplicates = async function() {
  try {
    console.log('Starting payment cleanup...');
    
    // Find payments with duplicate payment numbers
    const duplicates = await this.aggregate([
      {
        $group: {
          _id: '$paymentNo',
          count: { $sum: 1 },
          payments: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    let cleanedCount = 0;
    for (const duplicate of duplicates) {
      // Keep the first payment, delete the rest
      const paymentsToDelete = duplicate.payments.slice(1);
      
      for (const paymentId of paymentsToDelete) {
        await this.findByIdAndDelete(paymentId);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} duplicate payments`);
    return { cleanedCount, duplicateGroups: duplicates.length };
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    throw error;
  }
};

// Create and export the model
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;