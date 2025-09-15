const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { validateItem } = require('../middleware/validation');

// GET /api/items - Get all items with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, search, isUniversal } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.productName = { $regex: search, $options: 'i' };
    }
    
    if (isUniversal !== undefined) {
      filter.isUniversal = isUniversal === 'true';
    }
    
    const items = await Item.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    });
  }
});

// GET /api/items/:id - Get single item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    });
  }
});

// POST /api/items - Create new item
router.post('/', validateItem, async (req, res) => {
  try {
    const {
      productName,
      category,
      purchasePrice,
      salePrice,
      openingStock,
      asOfDate,
      lowStockAlert,
      isUniversal = false
    } = req.body;
    
    // Check if product name already exists
    const existingItem = await Item.findOne({ 
      productName: { $regex: new RegExp(`^${productName}$`, 'i') }
    });
    
    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: 'A product with this name already exists'
      });
    }
    
    const newItem = new Item({
      productName,
      category,
      purchasePrice,
      salePrice,
      openingStock,
      asOfDate,
      lowStockAlert,
      isUniversal
    });
    
    const savedItem = await newItem.save();
    
    res.status(201).json({
      success: true,
      data: savedItem,
      message: 'Item created successfully'
    });
  } catch (error) {
    console.error('Error creating item:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A product with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create item'
    });
  }
});

// PUT /api/items/:id - Update item
router.put('/:id', validateItem, async (req, res) => {
  try {
    const {
      productName,
      category,
      purchasePrice,
      salePrice,
      openingStock,
      asOfDate,
      lowStockAlert
    } = req.body;
    
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Check if product name already exists (excluding current item)
    if (productName !== item.productName) {
      const existingItem = await Item.findOne({ 
        productName: { $regex: new RegExp(`^${productName}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: 'A product with this name already exists'
        });
      }
    }
    
    // Update item
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      {
        productName,
        category,
        purchasePrice,
        salePrice,
        openingStock,
        asOfDate,
        lowStockAlert
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully'
    });
  } catch (error) {
    console.error('Error updating item:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A product with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

// DELETE /api/items/:id - Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Check if item is universal (cannot be deleted)
    if (item.isUniversal) {
      return res.status(400).json({
        success: false,
        error: 'Universal items cannot be deleted'
      });
    }
    
    await Item.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
});

// GET /api/items/stats/summary - Get items summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const primaryItems = await Item.countDocuments({ category: 'Primary' });
    const kiranaItems = await Item.countDocuments({ category: 'Kirana' });
    const universalItems = await Item.countDocuments({ isUniversal: true });
    
    // Calculate total stock value
    const items = await Item.find({}, 'openingStock purchasePrice');
    const totalStockValue = items.reduce((total, item) => {
      return total + (item.openingStock * 30 * item.purchasePrice); // Convert bags to kg
    }, 0);
    
    // Get low stock items
    const lowStockItems = await Item.find({
      $expr: { $lte: ['$openingStock', '$lowStockAlert'] }
    });
    
    res.json({
      success: true,
      data: {
        totalItems,
        primaryItems,
        kiranaItems,
        universalItems,
        totalStockValue: Math.round(totalStockValue),
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.map(item => ({
          id: item._id,
          productName: item.productName,
          currentStock: item.openingStock,
          lowStockAlert: item.lowStockAlert,
          stockInKg: Math.round(item.openingStock * 30)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching items summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items summary'
    });
  }
});

// POST /api/items/initialize-bardana - Initialize Bardana universal item
router.post('/initialize-bardana', async (req, res) => {
  try {
    // Check if Bardana already exists
    const existingBardana = await Item.findOne({ 
      isUniversal: true, 
      productName: 'Bardana' 
    });
    
    if (existingBardana) {
      return res.json({
        success: true,
        data: existingBardana,
        message: 'Bardana universal item already exists'
      });
    }
    
    // Create Bardana universal item
    const bardanaItem = new Item({
      productName: 'Bardana',
      category: 'Primary',
      purchasePrice: 0,
      salePrice: 0,
      openingStock: 0,
      asOfDate: new Date().toISOString().split('T')[0],
      lowStockAlert: 10,
      isUniversal: true
    });
    
    const savedBardana = await bardanaItem.save();
    
    res.status(201).json({
      success: true,
      data: savedBardana,
      message: 'Bardana universal item created successfully'
    });
  } catch (error) {
    console.error('Error initializing Bardana:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Bardana'
    });
  }
});

// GET /api/items/bardana - Get Bardana universal item
router.get('/bardana', async (req, res) => {
  try {
    const bardana = await Item.findOne({ 
      isUniversal: true, 
      productName: 'Bardana' 
    });
    
    if (!bardana) {
      return res.status(404).json({
        success: false,
        error: 'Bardana universal item not found'
      });
    }
    
    res.json({
      success: true,
      data: bardana
    });
  } catch (error) {
    console.error('Error fetching Bardana:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bardana'
    });
  }
});

// PUT /api/items/bardana/stock - Update Bardana stock (for internal use)
router.put('/bardana/stock', async (req, res) => {
  try {
    const { operation, quantity } = req.body; // operation: 'add' or 'subtract', quantity in kg
    
    if (!operation || !quantity || (operation !== 'add' && operation !== 'subtract')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Use "add" or "subtract" with a valid quantity'
      });
    }
    
    const bardana = await Item.findOne({ 
      isUniversal: true, 
      productName: 'Bardana' 
    });
    
    if (!bardana) {
      return res.status(404).json({
        success: false,
        error: 'Bardana universal item not found'
      });
    }
    
    // Convert kg to bags (1 bag = 30 kg)
    const quantityInBags = quantity / 30;
    
    let newStock;
    if (operation === 'add') {
      newStock = Math.round((bardana.openingStock + quantityInBags) * 100) / 100;
    } else {
      newStock = Math.max(0, Math.round((bardana.openingStock - quantityInBags) * 100) / 100);
    }
    
    const updatedBardana = await Item.findByIdAndUpdate(
      bardana._id,
      { openingStock: newStock },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedBardana,
      message: `Bardana stock ${operation === 'add' ? 'increased' : 'decreased'} by ${quantity} kg (${quantityInBags} bags)`
    });
  } catch (error) {
    console.error('Error updating Bardana stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Bardana stock'
    });
  }
});

module.exports = router;
