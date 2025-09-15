const mongoose = require('mongoose');

// SaleItem subdocument schema
const saleItemSchema = new mongoose.Schema({
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

// Main Sale schema
const saleSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: [true, 'Invoice number is required'],
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
    type: [saleItemSchema],
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
// Note: invoiceNo already has unique: true which creates an index
saleSchema.index({ partyName: 1 });
saleSchema.index({ phoneNumber: 1 });
saleSchema.index({ date: 1 });
saleSchema.index({ partyId: 1 });

// Pre-save middleware to sanitize data and calculate totals
saleSchema.pre('save', function(next) {
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

// Instance method to get formatted sale details
saleSchema.methods.getFormattedDetails = function() {
  return {
    id: this._id,
    invoiceNo: this.invoiceNo,
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

// Static method to generate next invoice number
saleSchema.statics.generateNextInvoiceNumber = async function() {
  try {
    const lastSale = await this.findOne().sort({ invoiceNo: -1 });
    
    if (!lastSale) {
      return '1';
    }
    
    const lastNumber = parseInt(lastSale.invoiceNo);
    if (isNaN(lastNumber)) {
      return '1';
    }
    
    return (lastNumber + 1).toString();
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return '1';
  }
};

// Static method to get sales by date range
saleSchema.statics.getSalesByDateRange = async function(startDate, endDate) {
  try {
    // Convert date strings to Date objects for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const sales = await this.find({
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).sort({ createdAt: -1 });
    
    return sales;
  } catch (error) {
    throw error;
  }
};

// Static method to get sales by party
saleSchema.statics.getSalesByParty = async function(partyName, phoneNumber) {
  try {
    const filter = {};
    
    if (partyName) {
      filter.partyName = { $regex: partyName, $options: 'i' };
    }
    
    if (phoneNumber) {
      filter.phoneNumber = phoneNumber;
    }
    
    const sales = await this.find(filter).sort({ createdAt: -1 });
    return sales;
  } catch (error) {
    throw error;
  }
};

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;
