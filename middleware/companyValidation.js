const validateCompanyDetails = (req, res, next) => {
  try {
    const companyData = req.body;
    
    // Check if required fields are present
    if (!companyData || typeof companyData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Company details data is required'
      });
    }

    const errors = [];
    
    // Validate business name
    if (!companyData.businessName || companyData.businessName.trim() === '') {
      errors.push('Business name is required');
    } else if (companyData.businessName.length > 100) {
      errors.push('Business name cannot exceed 100 characters');
    }
    
    // Validate primary phone number
    if (!companyData.phoneNumber1 || companyData.phoneNumber1.trim() === '') {
      errors.push('Primary phone number is required');
    } else if (!isValidPhoneNumber(companyData.phoneNumber1)) {
      errors.push('Invalid primary phone number format');
    }
    
    // Validate secondary phone number (optional)
    if (companyData.phoneNumber2 && companyData.phoneNumber2.trim() !== '') {
      if (!isValidPhoneNumber(companyData.phoneNumber2)) {
        errors.push('Invalid secondary phone number format');
      }
    }
    
    // Validate email
    if (!companyData.emailId || companyData.emailId.trim() === '') {
      errors.push('Email ID is required');
    } else if (!isValidEmail(companyData.emailId)) {
      errors.push('Invalid email format');
    }
    
    // Validate business address
    if (!companyData.businessAddress || companyData.businessAddress.trim() === '') {
      errors.push('Business address is required');
    } else if (companyData.businessAddress.length > 500) {
      errors.push('Business address cannot exceed 500 characters');
    }
    
    // Validate pincode
    if (!companyData.pincode || companyData.pincode.trim() === '') {
      errors.push('Pincode is required');
    } else if (!isValidPincode(companyData.pincode)) {
      errors.push('Invalid pincode format (should be 6 digits)');
    }
    
    // Validate business description
    if (!companyData.businessDescription || companyData.businessDescription.trim() === '') {
      errors.push('Business description is required');
    } else if (companyData.businessDescription.length > 200) {
      errors.push('Business description cannot exceed 200 characters');
    }
    
    // Validate signature
    if (!companyData.signature || companyData.signature.trim() === '') {
      errors.push('Signature is required');
    } else if (companyData.signature.length > 50) {
      errors.push('Signature cannot exceed 50 characters');
    }
    
    // Validate profile image URL (optional)
    if (companyData.profileImage && companyData.profileImage.trim() !== '') {
      if (!isValidUrl(companyData.profileImage)) {
        errors.push('Invalid profile image URL format');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Sanitize data
    if (companyData.phoneNumber1) {
      companyData.phoneNumber1 = sanitizePhoneNumber(companyData.phoneNumber1);
    }
    if (companyData.phoneNumber2) {
      companyData.phoneNumber2 = sanitizePhoneNumber(companyData.phoneNumber2);
    }
    if (companyData.emailId) {
      companyData.emailId = companyData.emailId.toLowerCase().trim();
    }
    if (companyData.businessName) {
      companyData.businessName = companyData.businessName.trim();
    }
    if (companyData.businessAddress) {
      companyData.businessAddress = companyData.businessAddress.trim();
    }
    if (companyData.businessDescription) {
      companyData.businessDescription = companyData.businessDescription.trim();
    }
    if (companyData.signature) {
      companyData.signature = companyData.signature.trim();
    }

    next();
  } catch (error) {
    console.error('Company validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
};

// Helper functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
};

const isValidPincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const sanitizePhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure it starts with + for international format
  if (!cleaned.startsWith('+')) {
    // If it starts with 91 (India), add +
    if (cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    } else {
      // Assume it's a local number, add +91
      cleaned = '+91' + cleaned;
    }
  }
  
  return cleaned;
};

module.exports = {
  validateCompanyDetails,
  sanitizePhoneNumber
};
