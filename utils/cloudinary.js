const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  /**
   * Upload PDF file to Cloudinary
   * @param {string} filePath - Local file path
   * @param {string} fileName - File name for public_id
   * @param {string} folder - Cloudinary folder (default: 'invoices')
   * @returns {Promise<Object>} Upload result
   */
  static async uploadPdf(filePath, fileName, folder = 'invoices') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: folder,
        public_id: fileName,
        format: 'pdf',
        overwrite: true
      });

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        asset_id: result.asset_id,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Public ID of the file
   * @param {string} resourceType - Resource type (default: 'raw')
   * @returns {Promise<Object>} Delete result
   */
  static async deleteFile(publicId, resourceType = 'raw') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      return {
        success: true,
        result: result
      };
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file information from Cloudinary
   * @param {string} publicId - Public ID of the file
   * @param {string} resourceType - Resource type (default: 'raw')
   * @returns {Promise<Object>} File info
   */
  static async getFileInfo(publicId, resourceType = 'raw') {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        success: true,
        info: result
      };
    } catch (error) {
      console.error('Cloudinary get info error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if Cloudinary is properly configured
   * @returns {boolean} Configuration status
   */
  static isConfigured() {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && 
              process.env.CLOUDINARY_API_KEY && 
              process.env.CLOUDINARY_API_SECRET);
  }

  /**
   * Get Cloudinary configuration info
   * @returns {Object} Configuration info
   */
  static getConfigInfo() {
    return {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : null,
      configured: this.isConfigured()
    };
  }
}

module.exports = CloudinaryService;
