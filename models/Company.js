const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  businessName: {
    type: String,
    trim: true
  },
  phoneNumber1: {
    type: String,
    trim: true
  },
  phoneNumber2: {
    type: String,
    trim: true
  },
  emailId: {
    type: String,
    trim: true,
    lowercase: true
  },
  businessAddress: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  businessDescription: {
    type: String,
    trim: true
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
    businessDescription: 'Your Business Description'
  };
};

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
