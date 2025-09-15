const mongoose = require('mongoose');

// PurchaseItem subdocument schema
const purchaseItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Item ID is required']
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative']
  }
}, { _id: false }); // Disable _id for subdocuments

// Main Purchase schema
const purchaseSchema = new mongoose.Schema({
  billNo: {
    type: String,
    required: [true, 'Bill number is required'],
    unique: true,
    trim: true
  },
  partyName: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
    maxlength: [100, 'Party name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic phone number validation
        return /^\+?[1-9]\d{1,14}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Invalid phone number format'
    }
  },
  items: {
    type: [purchaseItemSchema],
    required: [true, 'Items are required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'At least one item is required'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{1,2}\/\d{1,2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format']
  },
  pdfUri: {
    type: String,
    required: false,
    trim: true
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: false // Will be populated when party is created/updated
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  versionKey: false // Removes __v field
});

// Index for better query performance
// Note: billNo already has unique: true which creates an index
purchaseSchema.index({ partyName: 1 });
purchaseSchema.index({ phoneNumber: 1 });
purchaseSchema.index({ date: 1 });
purchaseSchema.index({ partyId: 1 });

// Pre-save middleware to sanitize data and calculate totals
purchaseSchema.pre('save', function(next) {
  // Sanitize phone number
  if (this.phoneNumber) {
    this.phoneNumber = this.phoneNumber.replace(/[^\d+]/g, '');
    if (!this.phoneNumber.startsWith('+')) {
      this.phoneNumber = '+91' + this.phoneNumber;
    }
  }
  
  // Recalculate total amount from items
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => {
      // Ensure item total is calculated correctly
      item.total = item.quantity * item.rate;
      return sum + item.total;
    }, 0);
  }
  
  next();
});

// Instance method to get formatted purchase details
purchaseSchema.methods.getFormattedDetails = function() {
  return {
    id: this._id,
    billNo: this.billNo,
    partyName: this.partyName,
    phoneNumber: this.phoneNumber,
    items: this.items,
    totalAmount: this.totalAmount,
    date: this.date,
    pdfUri: this.pdfUri,
    partyId: this.partyId,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to generate next bill number
purchaseSchema.statics.generateNextBillNumber = async function() {
  try {
    const lastPurchase = await this.findOne().sort({ billNo: -1 });
    
    if (!lastPurchase) {
      return '1';
    }
    
    const lastNumber = parseInt(lastPurchase.billNo);
    if (isNaN(lastNumber)) {
      return '1';
    }
    
    return (lastNumber + 1).toString();
  } catch (error) {
    console.error('Error generating bill number:', error);
    return '1';
  }
};

// Static method to get purchases by date range
purchaseSchema.statics.getPurchasesByDateRange = async function(startDate, endDate) {
  try {
    // Convert date strings to Date objects for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const purchases = await this.find({
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).sort({ createdAt: -1 });
    
    return purchases;
  } catch (error) {
    throw error;
  }
};

// Static method to get purchases by party
purchaseSchema.statics.getPurchasesByParty = async function(partyName, phoneNumber) {
  try {
    const filter = {};
    
    if (partyName) {
      filter.partyName = { $regex: partyName, $options: 'i' };
    }
    
    if (phoneNumber) {
      filter.phoneNumber = phoneNumber;
    }
    
    const purchases = await this.find(filter).sort({ createdAt: -1 });
    return purchases;
  } catch (error) {
    throw error;
  }
};

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
