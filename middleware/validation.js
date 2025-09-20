const validateInvoiceNumber = (invoiceNo) => {
  if (!invoiceNo || typeof invoiceNo !== 'string') {
    return false;
  }
  
  const trimmed = invoiceNo.trim();
  
  // Check length (1-50 characters)
  if (trimmed.length < 1 || trimmed.length > 50) {
    return false;
  }
  
  // Check format: alphanumeric characters, hyphens, and underscores only
  return /^[A-Za-z0-9\-_]+$/.test(trimmed);
};

const validateBillNumber = (billNo) => {
  if (!billNo || typeof billNo !== 'string') {
    return false;
  }
  
  const trimmed = billNo.trim();
  
  // Check length (1-50 characters)
  if (trimmed.length < 1 || trimmed.length > 50) {
    return false;
  }
  
  // Check format: alphanumeric characters, hyphens, and underscores only
  return /^[A-Za-z0-9\-_]+$/.test(trimmed);
};

const validateSaleRequest = (req, res, next) => {
  const { 
    invoiceNo,
    partyName, 
    phoneNumber, 
    items, 
    date, 
    pdfUri 
  } = req.body;

  // Validate required fields
  if (!invoiceNo || !partyName || !phoneNumber || !items || !date) {
    return res.status(400).json({
      success: false,
      error: 'Invoice number, party name, phone number, items, and date are required'
    });
  }

  // Validate invoice number format
  if (!validateInvoiceNumber(invoiceNo)) {
    return res.status(400).json({
      success: false,
      error: 'Invoice number must contain only alphanumeric characters, hyphens, and underscores (1-50 characters)'
    });
  }

  // Validate phone number
  if (!validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Please include country code (e.g., +91xxxxxxxxxx)'
    });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one item is required'
    });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.itemName || !item.quantity || !item.rate) {
      return res.status(400).json({
        success: false,
        error: `Item ${i + 1}: itemName, quantity, and rate are required`
      });
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: `Item ${i + 1}: quantity must be a positive number`
      });
    }
    
    if (typeof item.rate !== 'number' || item.rate <= 0) {
      return res.status(400).json({
        success: false,
        error: `Item ${i + 1}: rate must be a positive number`
      });
    }
  }

  // Validate date format (MM/DD/YYYY)
  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      success: false,
      error: 'Date must be in MM/DD/YYYY format'
    });
  }

  // Sanitize phone number
  req.body.phoneNumber = sanitizePhoneNumber(phoneNumber);
  req.body.invoiceNo = invoiceNo.trim();
  
  next();
};

const validatePurchaseRequest = (req, res, next) => {
  const { 
    billNo,
    partyName, 
    phoneNumber, 
    items, 
    date, 
    pdfUri 
  } = req.body;

  // Validate required fields
  if (!billNo || !partyName || !phoneNumber || !items || !date) {
    return res.status(400).json({
      success: false,
      error: 'Bill number, party name, phone number, items, and date are required'
    });
  }

  // Validate bill number format
  if (!validateBillNumber(billNo)) {
    return res.status(400).json({
      success: false,
      error: 'Bill number must contain only alphanumeric characters, hyphens, and underscores (1-50 characters)'
    });
  }

  // Validate phone number
  if (!validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Please include country code (e.g., +91xxxxxxxxxx)'
    });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one item is required'
    });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.itemName || !item.quantity || !item.rate) {
      return res.status(400).json({
        success: false,
        error: `Item ${i + 1}: itemName, quantity, and rate are required`
      });
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: `Item ${i + 1}: quantity must be a positive number`
      });
    }
    
    if (typeof item.rate !== 'number' || item.rate <= 0) {
      return res.status(400).json({
        success: false,
        error: `Item ${i + 1}: rate must be a positive number`
      });
    }
  }

  // Validate date format (MM/DD/YYYY)
  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      success: false,
      error: 'Date must be in MM/DD/YYYY format'
    });
  }

  // Sanitize phone number
  req.body.phoneNumber = sanitizePhoneNumber(phoneNumber);
  req.body.billNo = billNo.trim();
  
  next();
};

const validatePhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  return /^\+[1-9]\d{9,14}$/.test(cleaned);
};

const validateFileType = (mimetype) => {
  const allowedTypes = ['application/pdf'];
  return allowedTypes.includes(mimetype);
};

const validateFileSize = (size, maxSize = 50 * 1024 * 1024) => {
  return size <= maxSize;
};

const sanitizePhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
};

const validateUploadRequest = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  if (!validateFileType(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'Only PDF files are allowed'
    });
  }

  if (!validateFileSize(req.file.size)) {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds maximum limit of 50MB'
    });
  }

  next();
};

const validateWhatsAppRequest = (req, res, next) => {
  const { 
    phoneNumber, 
    documentUrl, 
    fileName, 
    message,
    documentType,
    invoiceNo,
    customerName,
    amount,
    billNo,
    supplierName,
    receiptNo,
    voucherNo
  } = req.body;

  // Validate required fields
  if (!phoneNumber || !documentUrl || !fileName) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: phoneNumber, documentUrl, fileName'
    });
  }

  // Validate phone number
  if (!validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format. Please include country code (e.g., +91xxxxxxxxxx)'
    });
  }

  // Validate document URL
  try {
    new URL(documentUrl);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid document URL format'
    });
  }

  // Validate file name
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'File name must be a non-empty string'
    });
  }

  // Validate message if provided
  if (message !== undefined && message !== null && typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message must be a string'
    });
  }

  // Validate document type specific fields
  if (documentType) {
    switch (documentType) {
      case 'invoice':
        if (!invoiceNo || !customerName || !amount) {
          return res.status(400).json({
            success: false,
            error: 'Missing invoice data: invoiceNo, customerName, amount'
          });
        }
        break;

      case 'purchase-bill':
        if (!billNo || !supplierName || !amount) {
          return res.status(400).json({
            success: false,
            error: 'Missing purchase bill data: billNo, supplierName, amount'
          });
        }
        break;

      case 'payment-receipt':
        if (!receiptNo || !customerName || !amount) {
          return res.status(400).json({
            success: false,
            error: 'Missing payment receipt data: receiptNo, customerName, amount'
          });
        }
        break;

      case 'payment-voucher':
        if (!voucherNo || !supplierName || !amount) {
          return res.status(400).json({
            success: false,
            error: 'Missing payment voucher data: voucherNo, supplierName, amount'
          });
        }
        break;
    }
  }

  // Validate amount if provided
  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a non-negative number'
      });
    }
  }

  // Sanitize phone number
  req.body.phoneNumber = sanitizePhoneNumber(phoneNumber);
  
  next();
};

const validateItem = (req, res, next) => {
  const { productName, category, openingStock, lowStockAlert } = req.body;

  // Check required fields
  if (!productName || !category || openingStock === undefined || lowStockAlert === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: productName, category, openingStock, lowStockAlert'
    });
  }

  // Validate product name
  if (typeof productName !== 'string' || productName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Product name must be a non-empty string'
    });
  }

  // Validate category
  if (!['Primary', 'Kirana'].includes(category)) {
    return res.status(400).json({
      success: false,
      error: 'Category must be either "Primary" or "Kirana"'
    });
  }

  // Validate numeric fields
  if (typeof openingStock !== 'number' || openingStock < 0) {
    return res.status(400).json({
      success: false,
      error: 'Opening stock must be a non-negative number'
    });
  }

  if (typeof lowStockAlert !== 'number' || lowStockAlert < 0) {
    return res.status(400).json({
      success: false,
      error: 'Low stock alert must be a non-negative number'
    });
  }

  // Sanitize product name
  req.body.productName = productName.trim();
  
  next();
};

module.exports = {
  validatePhoneNumber,
  validateInvoiceNumber,
  validateBillNumber,
  validateSaleRequest,
  validatePurchaseRequest,
  validateFileType,
  validateFileSize,
  sanitizePhoneNumber,
  validateUploadRequest,
  validateWhatsAppRequest,
  validateItem
};