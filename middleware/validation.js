const validatePhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  return /^\+[1-9]\d{9,14}$/.test(cleaned);
};

const validateFileType = (mimetype) => {
  const allowedTypes = ['application/pdf'];
  return allowedTypes.includes(mimetype);
};

const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => {
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
      error: 'File size exceeds maximum limit of 10MB'
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
  validateFileType,
  validateFileSize,
  sanitizePhoneNumber,
  validateUploadRequest,
  validateWhatsAppRequest,
  validateItem
};