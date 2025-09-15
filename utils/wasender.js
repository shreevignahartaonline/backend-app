const axios = require('axios');
require('dotenv').config();

/**
 * WASender API Service for sending WhatsApp messages with documents
 */
class WASenderService {
  constructor() {
    this.apiKey = process.env.WASENDER_API_KEY;
    this.baseUrl = 'https://www.wasenderapi.com/api';
    
    if (!this.apiKey) {
      console.warn('⚠️ WASENDER_API_KEY not found in environment variables');
    }
  }

  /**
   * Check if WASender is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Send PDF document via WhatsApp
   * @param {string} phoneNumber - Recipient's phone number (with country code)
   * @param {string} documentUrl - URL of the PDF document
   * @param {string} fileName - Name of the file
   * @param {string} message - Optional message text
   * @param {string} documentType - Type of document (invoice, purchase-bill, etc.)
   * @returns {Promise<Object>} Send result
   */
  async sendDocument(phoneNumber, documentUrl, fileName, message = '', documentType = 'document') {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'WASender API key not configured'
        };
      }

      // Format phone number (ensure it starts with +)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Generate default message if not provided
      const defaultMessage = this.generateDefaultMessage(documentType, fileName);
      const finalMessage = message || defaultMessage;

      // Debug logging
      console.log('🔍 Message Debug:', {
        message: message,
        documentType: documentType,
        fileName: fileName,
        defaultMessage: defaultMessage,
        finalMessage: finalMessage
      });

      // Ensure text field is always a string
      const textMessage = typeof finalMessage === 'string' ? finalMessage : String(finalMessage || defaultMessage || 'Please find the document attached.');
      
      // Additional validation - ensure text is never empty
      const finalTextMessage = textMessage.trim() || 'Please find the document attached.';

      const payload = {
        to: formattedPhone,
        text: finalTextMessage,
        documentUrl: documentUrl,
        fileName: fileName
      };

      console.log('📤 Sending WhatsApp document:', {
        to: formattedPhone,
        fileName: fileName,
        documentType: documentType,
        textMessage: finalTextMessage.substring(0, 50) + (finalTextMessage.length > 50 ? '...' : '')
      });

      console.log('📤 WASender API Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${this.baseUrl}/send-message`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      });

      if (response.status === 200) {
        console.log('✅ WhatsApp document sent successfully');
        return {
          success: true,
          messageId: response.data.messageId || response.data.id,
          status: response.data.status || 'sent',
          response: response.data
        };
      } else {
        return {
          success: false,
          error: `Unexpected response status: ${response.status}`,
          response: response.data
        };
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp document:', error.message);
      
      if (error.response) {
        // API returned an error response
        return {
          success: false,
          error: error.response.data?.message || error.response.data?.error || 'API error',
          statusCode: error.response.status,
          response: error.response.data
        };
      } else if (error.request) {
        // Network error
        return {
          success: false,
          error: 'Network error - unable to reach WASender API'
        };
      } else {
        // Other error
        return {
          success: false,
          error: error.message || 'Unknown error occurred'
        };
      }
    }
  }

  /**
   * Send invoice PDF via WhatsApp
   * @param {string} phoneNumber - Customer's phone number
   * @param {string} documentUrl - Invoice PDF URL
   * @param {string} fileName - File name for the invoice
   * @param {string} invoiceNo - Invoice number
   * @param {string} customerName - Customer name
   * @param {string} amount - Invoice amount
   * @returns {Promise<Object>} Send result
   */
  async sendInvoice(phoneNumber, documentUrl, fileName, invoiceNo, customerName, amount) {
    return this.sendDocument(phoneNumber, documentUrl, fileName, '', 'invoice');
  }

  /**
   * Send purchase bill PDF via WhatsApp
   * @param {string} phoneNumber - Supplier's phone number
   * @param {string} documentUrl - Purchase bill PDF URL
   * @param {string} fileName - File name for the purchase bill
   * @param {string} billNo - Bill number
   * @param {string} supplierName - Supplier name
   * @param {string} amount - Bill amount
   * @returns {Promise<Object>} Send result
   */
  async sendPurchaseBill(phoneNumber, documentUrl, fileName, billNo, supplierName, amount) {
    return this.sendDocument(phoneNumber, documentUrl, fileName, '', 'purchase-bill');
  }

  /**
   * Send payment receipt PDF via WhatsApp
   * @param {string} phoneNumber - Customer's phone number
   * @param {string} documentUrl - Payment receipt PDF URL
   * @param {string} fileName - File name for the payment receipt
   * @param {string} receiptNo - Receipt number
   * @param {string} customerName - Customer name
   * @param {string} amount - Payment amount
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentReceipt(phoneNumber, documentUrl, fileName, receiptNo, customerName, amount) {
    return this.sendDocument(phoneNumber, documentUrl, fileName, '', 'payment-receipt');
  }

  /**
   * Send payment voucher PDF via WhatsApp
   * @param {string} phoneNumber - Supplier's phone number
   * @param {string} documentUrl - Payment voucher PDF URL
   * @param {string} fileName - File name for the payment voucher
   * @param {string} voucherNo - Voucher number
   * @param {string} supplierName - Supplier name
   * @param {string} amount - Payment amount
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentVoucher(phoneNumber, documentUrl, fileName, voucherNo, supplierName, amount) {
    return this.sendDocument(phoneNumber, documentUrl, fileName, '', 'payment-voucher');
  }

  /**
   * Format phone number to include country code
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it doesn't start with country code, assume India (+91)
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('+')) {
      return phoneNumber; // Already formatted
    } else {
      return `+${cleaned}`;
    }
  }

  /**
   * Generate default message based on document type
   * @param {string} documentType - Type of document
   * @param {string} fileName - File name
   * @returns {string} Default message
   */
  generateDefaultMessage(documentType, fileName) {
    const messages = {
      'invoice': `📄 Invoice: ${fileName}\n\nPlease find your invoice attached.`,
      'purchase-bill': `📄 Purchase Bill: ${fileName}\n\nPlease find the purchase bill attached.`,
      'payment-receipt': `📄 Payment Receipt: ${fileName}\n\nPlease find your payment receipt attached.`,
      'payment-voucher': `📄 Payment Voucher: ${fileName}\n\nPlease find the payment voucher attached.`,
      'document': `📄 Document: ${fileName}\n\nPlease find the document attached.`
    };
    
    return messages[documentType] || messages['document'];
  }

  /**
   * Get WASender configuration info
   * @returns {Object} Configuration info
   */
  getConfigInfo() {
    return {
      configured: this.isConfigured(),
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
      baseUrl: this.baseUrl
    };
  }

  /**
   * Test WASender API connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'WASender API key not configured'
        };
      }

      // Try to send a test message (you might need to adjust this based on WASender API)
      const response = await axios.get(`${this.baseUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.data,
        message: 'WASender API connection successful'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to connect to WASender API'
      };
    }
  }
}

module.exports = new WASenderService();
