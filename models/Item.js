const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Primary', 'Kirana'],
    default: 'Primary'
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  salePrice: {
    type: Number,
    required: [true, 'Sale price is required'],
    min: [0, 'Sale price cannot be negative']
  },
  openingStock: {
    type: Number,
    required: [true, 'Opening stock is required'],
    min: [0, 'Opening stock cannot be negative']
  },
  asOfDate: {
    type: String,
    required: [true, 'As of date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  lowStockAlert: {
    type: Number,
    required: [true, 'Low stock alert is required'],
    min: [0, 'Low stock alert cannot be negative']
  },
  isUniversal: {
    type: Boolean,
    default: false
  }
}, {
  // Pre-save middleware to handle Bardana initialization
  pre: {
    save: function(next) {
      // If this is a new Bardana item, ensure it has the correct properties
      if (this.isUniversal && this.productName === 'Bardana') {
        this.purchasePrice = this.purchasePrice || 0;
        this.salePrice = this.salePrice || 0;
        this.openingStock = this.openingStock || 0;
        this.lowStockAlert = this.lowStockAlert || 10;
      }
      next();
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
// Note: productName already has unique: true which creates an index
itemSchema.index({ category: 1 });
itemSchema.index({ isUniversal: 1 });

module.exports = mongoose.model('Item', itemSchema);
