const express = require('express');
const Company = require('../models/Company');

const router = express.Router();

// GET /company/details - Get company details
router.get('/details', async (req, res) => {
  try {
    // Since there should only be one company record, we'll get the first one
    const company = await Company.findOne().sort({ createdAt: -1 });
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company details not found',
        data: null
      });
    }

    res.json({
      success: true,
      data: company.getFormattedDetails(),
      message: 'Company details retrieved successfully'
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /company/details - Create or update company details
router.post('/details', async (req, res) => {
  console.log('=== POST /company/details DEBUG START ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request headers:', req.headers);
  
  try {
    // Check if company details already exist
    console.log('🔍 Checking for existing company...');
    let company = await Company.findOne().sort({ createdAt: -1 });
    console.log('Existing company found:', company ? 'YES' : 'NO');
    
    if (company) {
      console.log('📝 Updating existing company details...');
      console.log('Company ID:', company._id);
      console.log('Current company data:', JSON.stringify(company.toObject(), null, 2));
      
      // Update existing company details
      console.log('🔄 Applying updates...');
      Object.assign(company, req.body);
      console.log('Updated company data:', JSON.stringify(company.toObject(), null, 2));
      
      console.log('💾 Saving company...');
      await company.save();
      console.log('✅ Company saved successfully');
      
      const formattedDetails = company.getFormattedDetails();
      console.log('📤 Returning formatted details:', JSON.stringify(formattedDetails, null, 2));
      
      res.json({
        success: true,
        data: formattedDetails,
        message: 'Company details updated successfully'
      });
    } else {
      console.log('🆕 Creating new company details...');
      // Create new company details
      company = new Company(req.body);
      console.log('New company instance created:', JSON.stringify(company.toObject(), null, 2));
      
      console.log('💾 Saving new company...');
      await company.save();
      console.log('✅ New company saved successfully');
      
      const formattedDetails = company.getFormattedDetails();
      console.log('📤 Returning formatted details:', JSON.stringify(formattedDetails, null, 2));
      
      res.status(201).json({
        success: true,
        data: formattedDetails,
        message: 'Company details created successfully'
      });
    }
  } catch (error) {
    console.error('❌ Create/Update company details error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      console.log('🚫 Validation error detected');
      const errors = Object.values(error.errors).map(err => err.message);
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    console.log('🔥 Internal server error');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
  
  console.log('=== POST /company/details DEBUG END ===');
});

// PUT /company/details - Update company details (alternative endpoint)
router.put('/details', async (req, res) => {
  console.log('=== PUT /company/details DEBUG START ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request headers:', req.headers);
  
  try {
    console.log('🔍 Looking for existing company to update...');
    const company = await Company.findOne().sort({ createdAt: -1 });
    console.log('Existing company found:', company ? 'YES' : 'NO');
    
    if (!company) {
      console.log('❌ No company found to update');
      return res.status(404).json({
        success: false,
        error: 'Company details not found',
        message: 'No company details found to update'
      });
    }

    console.log('📝 Found company to update');
    console.log('Company ID:', company._id);
    console.log('Current company data:', JSON.stringify(company.toObject(), null, 2));

    // Update company details
    console.log('🔄 Applying updates...');
    Object.assign(company, req.body);
    console.log('Updated company data:', JSON.stringify(company.toObject(), null, 2));
    
    console.log('💾 Saving company...');
    await company.save();
    console.log('✅ Company saved successfully');
    
    const formattedDetails = company.getFormattedDetails();
    console.log('📤 Returning formatted details:', JSON.stringify(formattedDetails, null, 2));
    
    res.json({
      success: true,
      data: formattedDetails,
      message: 'Company details updated successfully'
    });
  } catch (error) {
    console.error('❌ Update company details error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('🚫 Validation error detected');
      const errors = Object.values(error.errors).map(err => err.message);
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    console.log('🔥 Internal server error');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
  
  console.log('=== PUT /company/details DEBUG END ===');
});

// DELETE /company/details - Delete company details
router.delete('/details', async (req, res) => {
  try {
    const company = await Company.findOne().sort({ createdAt: -1 });
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company details not found',
        message: 'No company details found to delete'
      });
    }

    await Company.findByIdAndDelete(company._id);
    
    res.json({
      success: true,
      message: 'Company details deleted successfully'
    });
  } catch (error) {
    console.error('Delete company details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /company/details/default - Get default company details template
router.get('/details/default', (req, res) => {
  try {
    const defaultDetails = Company.getDefaultDetails();
    res.json({
      success: true,
      data: defaultDetails,
      message: 'Default company details template retrieved'
    });
  } catch (error) {
    console.error('Get default company details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /company/status - Get company service status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Company service is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      'get-details': 'GET /company/details',
      'create-update-details': 'POST /company/details',
      'update-details': 'PUT /company/details',
      'delete-details': 'DELETE /company/details',
      'get-default': 'GET /company/details/default'
    }
  });
});

module.exports = router;
