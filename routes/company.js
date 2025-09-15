const express = require('express');
const Company = require('../models/Company');
const { validateCompanyDetails } = require('../middleware/companyValidation');

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
router.post('/details', validateCompanyDetails, async (req, res) => {
  try {
    // Check if company details already exist
    let company = await Company.findOne().sort({ createdAt: -1 });
    
    if (company) {
      // Update existing company details
      Object.assign(company, req.body);
      await company.save();
      
      res.json({
        success: true,
        data: company.getFormattedDetails(),
        message: 'Company details updated successfully'
      });
    } else {
      // Create new company details
      company = new Company(req.body);
      await company.save();
      
      res.status(201).json({
        success: true,
        data: company.getFormattedDetails(),
        message: 'Company details created successfully'
      });
    }
  } catch (error) {
    console.error('Create/Update company details error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// PUT /company/details - Update company details (alternative endpoint)
router.put('/details', validateCompanyDetails, async (req, res) => {
  try {
    const company = await Company.findOne().sort({ createdAt: -1 });
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company details not found',
        message: 'No company details found to update'
      });
    }

    // Update company details
    Object.assign(company, req.body);
    await company.save();
    
    res.json({
      success: true,
      data: company.getFormattedDetails(),
      message: 'Company details updated successfully'
    });
  } catch (error) {
    console.error('Update company details error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
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

// POST /company/details/validate - Validate company details without saving
router.post('/details/validate', validateCompanyDetails, (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Company details validation passed',
      data: req.body
    });
  } catch (error) {
    console.error('Validate company details error:', error);
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
      'get-default': 'GET /company/details/default',
      'validate': 'POST /company/details/validate'
    }
  });
});

module.exports = router;
