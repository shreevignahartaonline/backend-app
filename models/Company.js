const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  phoneNumber1: {
    type: String,
    required: [true, 'Primary phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic phone number validation - can be enhanced
        return /^\+?[1-9]\d{1,14}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Invalid phone number format'
    }
  },
  phoneNumber2: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\+?[1-9]\d{1,14}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Invalid secondary phone number format'
    }
  },
  emailId: {
    type: String,
    required: [true, 'Email ID is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  businessAddress: {
    type: String,
    required: [true, 'Business address is required'],
    trim: true,
    maxlength: [500, 'Business address cannot exceed 500 characters']
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Indian pincode validation
        return /^[1-9][0-9]{5}$/.test(v);
      },
      message: 'Invalid pincode format (should be 6 digits)'
    }
  },
  businessDescription: {
    type: String,
    required: [true, 'Business description is required'],
    trim: true,
    maxlength: [200, 'Business description cannot exceed 200 characters']
  },
  signature: {
    type: String,
    required: [true, 'Signature is required'],
    trim: true,
    maxlength: [50, 'Signature cannot exceed 50 characters']
  },
  profileImage: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid profile image URL format'
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  versionKey: false // Removes __v field
});

// Index for better query performance
companySchema.index({ businessName: 1 });
companySchema.index({ emailId: 1 });

// Instance method to get formatted company details
companySchema.methods.getFormattedDetails = function() {
  return {
    id: this._id,
    businessName: this.businessName,
    phoneNumber1: this.phoneNumber1,
    phoneNumber2: this.phoneNumber2,
    emailId: this.emailId,
    businessAddress: this.businessAddress,
    pincode: this.pincode,
    businessDescription: this.businessDescription,
    signature: this.signature,
    profileImage: this.profileImage,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to get default company details
companySchema.statics.getDefaultDetails = function() {
  return {
    businessName: 'Your Business Name',
    phoneNumber1: '+91-9876543210',
    phoneNumber2: '+91-9876543211',
    emailId: 'contact@yourbusiness.com',
    businessAddress: 'Your Business Address',
    pincode: '123456',
    businessDescription: 'Your Business Description',
    signature: 'Authorized Person',
    profileImage: null
  };
};

// Pre-save middleware to sanitize data
companySchema.pre('save', function(next) {
  // Sanitize phone numbers
  if (this.phoneNumber1) {
    this.phoneNumber1 = this.phoneNumber1.replace(/[^\d+]/g, '');
    if (!this.phoneNumber1.startsWith('+')) {
      this.phoneNumber1 = '+91' + this.phoneNumber1;
    }
  }
  
  if (this.phoneNumber2) {
    this.phoneNumber2 = this.phoneNumber2.replace(/[^\d+]/g, '');
    if (!this.phoneNumber2.startsWith('+')) {
      this.phoneNumber2 = '+91' + this.phoneNumber2;
    }
  }
  
  // Sanitize email
  if (this.emailId) {
    this.emailId = this.emailId.toLowerCase().trim();
  }
  
  next();
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
