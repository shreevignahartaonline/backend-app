const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CloudinaryService = require('../utils/cloudinary');
const WASenderService = require('../utils/wasender');
const { validateUploadRequest, validateWhatsAppRequest } = require('../middleware/validation');
require('dotenv').config();

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Upload PDF to Cloudinary or store locally
router.post('/', upload.single('file'), validateUploadRequest, async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = path.parse(req.file.originalname).name;

    // Check if Cloudinary is configured
    if (CloudinaryService.isConfigured()) {
      // Upload to Cloudinary
      const result = await CloudinaryService.uploadPdf(filePath, fileName, 'invoices');

      // Clean up local file
      fs.unlinkSync(filePath);

      if (result.success) {
        res.json({
          success: true,
          url: result.url,
          public_id: result.public_id,
          message: 'File uploaded successfully to Cloudinary'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to upload file to Cloudinary'
        });
      }
    } else {
      // Fallback: Store locally and return local URL
      const localUrl = `${req.protocol}://${req.get('host')}/uploads/${path.basename(filePath)}`;
      
      res.json({
        success: true,
        url: localUrl,
        message: 'File stored locally (Cloudinary not configured)',
        local: true
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

// Get upload status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Upload service is running',
    cloudinary: CloudinaryService.getConfigInfo(),
    wasender: WASenderService.getConfigInfo(),
    uploads: {
      max_file_size: process.env.MAX_FILE_SIZE || '10MB',
      allowed_types: ['application/pdf']
    }
  });
});

// Send PDF document via WhatsApp
router.post('/send-whatsapp', validateWhatsAppRequest, async (req, res) => {
  try {
    const { 
      phoneNumber, 
      documentUrl, 
      fileName, 
      message, 
      documentType,
      // Document-specific data
      invoiceNo,
      customerName,
      amount,
      billNo,
      supplierName,
      receiptNo,
      voucherNo
    } = req.body;


    // Check if WASender is configured
    if (!WASenderService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'WASender API not configured. Please add WASENDER_API_KEY to environment variables.'
      });
    }

    let result;

    // Send based on document type
    switch (documentType) {
      case 'invoice':
        result = await WASenderService.sendInvoice(phoneNumber, documentUrl, fileName, invoiceNo, customerName, amount);
        break;

      case 'purchase-bill':
        result = await WASenderService.sendPurchaseBill(phoneNumber, documentUrl, fileName, billNo, supplierName, amount);
        break;

      case 'payment-receipt':
        result = await WASenderService.sendPaymentReceipt(phoneNumber, documentUrl, fileName, receiptNo, customerName, amount);
        break;

      case 'payment-voucher':
        result = await WASenderService.sendPaymentVoucher(phoneNumber, documentUrl, fileName, voucherNo, supplierName, amount);
        break;

      default:
        // Generic document send
        result = await WASenderService.sendDocument(phoneNumber, documentUrl, fileName, message, documentType);
        break;
    }

    if (result.success) {
      res.json({
        success: true,
        message: 'Document sent via WhatsApp successfully',
        messageId: result.messageId,
        status: result.status,
        data: result.response
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        statusCode: result.statusCode,
        details: result.response
      });
    }

  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send document via WhatsApp'
    });
  }
});

// Test WASender API connection
router.get('/test-whatsapp', async (req, res) => {
  try {
    const result = await WASenderService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'WASender API connection successful',
        status: result.status
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('WhatsApp test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test WASender API'
    });
  }
});

module.exports = router;
