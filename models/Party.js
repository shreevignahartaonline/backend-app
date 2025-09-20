const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: {
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
  balance: {
    type: Number,
    default: 0,
  },
  address: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  versionKey: false // Removes __v field
});

// Index for better query performance
partySchema.index({ name: 1 });
partySchema.index({ phoneNumber: 1 });
partySchema.index({ name: 1, phoneNumber: 1 }); // Compound index for unique party identification

// Pre-save middleware to sanitize data
partySchema.pre('save', function(next) {
  // Sanitize phone number
  if (this.phoneNumber) {
    this.phoneNumber = this.phoneNumber.replace(/[^\d+]/g, '');
    if (!this.phoneNumber.startsWith('+')) {
      this.phoneNumber = '+91' + this.phoneNumber;
    }
  }
  
  // Sanitize email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  next();
});

// Instance method to get formatted party details
partySchema.methods.getFormattedDetails = function() {
  return {
    id: this._id,
    name: this.name,
    phoneNumber: this.phoneNumber,
    balance: this.balance,
    address: this.address,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find or create party
partySchema.statics.findOrCreate = async function(partyData) {
  try {
    // Try to find existing party by name and phone number
    let party = await this.findOne({
      name: partyData.name,
      phoneNumber: partyData.phoneNumber
    });
    
    if (!party) {
      // Create new party if not found
      party = new this(partyData);
      await party.save();
    }
    
    return party;
  } catch (error) {
    throw error;
  }
};

// Static method to update party balance
partySchema.statics.updateBalance = async function(partyId, amount, operation = 'add') {
  try {
    const party = await this.findById(partyId);
    if (!party) {
      throw new Error('Party not found');
    }
    
    if (operation === 'add') {
      party.balance += amount;
    } else if (operation === 'subtract') {
      party.balance -= amount;
    } else if (operation === 'set') {
      party.balance = amount;
    }
    
    // Allow negative balances - no floor restriction
    
    await party.save();
    return party;
  } catch (error) {
    throw error;
  }
};

const Party = mongoose.model('Party', partySchema);

module.exports = Party;
