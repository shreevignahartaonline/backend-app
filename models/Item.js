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
  openingStock: {
    type: Number,
    required: [true, 'Opening stock is required'],
    min: [0, 'Opening stock cannot be negative']
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
