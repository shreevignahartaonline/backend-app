const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Party = require('../models/Party');
const Item = require('../models/Item');

// GET /api/sales - Get all sales with optional filtering
router.get('/', async (req, res) => {
  try {
    const { partyName, phoneNumber, date, search } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (partyName) {
      filter.partyName = { $regex: partyName, $options: 'i' };
    }
    
    if (phoneNumber) {
      filter.phoneNumber = phoneNumber;
    }
    
    if (date) {
      filter.date = date;
    }
    
    if (search) {
      filter.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    const sales = await Sale.find(filter)
      .populate('partyId', 'name phoneNumber balance')
      .sort({ createdAt: -1 });
    
    // Transform _id to id for frontend compatibility
    const transformedSales = sales.map(sale => ({
      ...sale.toObject(),
      id: sale._id.toString(),
      _id: undefined // Remove _id to avoid confusion
    }));
    
    res.json({
      success: true,
      data: transformedSales,
      count: transformedSales.length
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales'
    });
  }
});

// GET /api/sales/:id - Get single sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('partyId', 'name phoneNumber balance');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }
    
    res.json({
      success: true,
      data: sale.getFormattedDetails()
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sale'
    });
  }
});

// POST /api/sales - Create new sale
router.post('/', async (req, res) => {
  try {
    const { 
      partyName, 
      phoneNumber, 
      items, 
      date, 
      pdfUri 
    } = req.body;
    
    // Validate required fields
    if (!partyName || !phoneNumber || !items || !date) {
      return res.status(400).json({
        success: false,
        error: 'Party name, phone number, items, and date are required'
      });
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required'
      });
    }
    
    // Generate invoice number
    const invoiceNo = await Sale.generateNextInvoiceNumber();
    
    // Find or create party
    const party = await Party.findOrCreate({
      name: partyName,
      phoneNumber: phoneNumber
    });
    
    // Create sale
    const sale = new Sale({
      invoiceNo,
      partyName,
      phoneNumber,
      items,
      totalAmount: 0, // Will be calculated in pre-save middleware
      date,
      pdfUri,
      partyId: party._id
    });
    
    await sale.save();
    
    // Update party balance (add to outstanding amount)
    await Party.updateBalance(party._id, sale.totalAmount, 'add');
    
    // Update stock levels for items
    for (const saleItem of items) {
      try {
        const item = await Item.findById(saleItem.id);
        if (item) {
          // Convert quantity from kg to bags (assuming 30kg per bag)
          const quantityInBags = saleItem.quantity / 30;
          item.openingStock -= quantityInBags;
          
          // Ensure stock doesn't go negative
          if (item.openingStock < 0) {
            item.openingStock = 0;
          }
          
          await item.save();
        }
      } catch (itemError) {
        console.error(`Error updating stock for item ${saleItem.id}:`, itemError);
        // Continue with other items even if one fails
      }
    }
    
    // Update Bardana stock (universal item)
    try {
      const bardanaItem = await Item.findOne({ 
        isUniversal: true, 
        productName: 'Bardana' 
      });
      
      if (bardanaItem) {
        // Reduce Bardana stock by the same amount as total items sold (in kg)
        const totalKgSold = items.reduce((sum, item) => sum + item.quantity, 0);
        const bardanaBagsToReduce = totalKgSold / 30;
        
        bardanaItem.openingStock -= bardanaBagsToReduce;
        if (bardanaItem.openingStock < 0) {
          bardanaItem.openingStock = 0;
        }
        
        await bardanaItem.save();
      }
    } catch (bardanaError) {
      console.error('Error updating Bardana stock:', bardanaError);
      // Continue even if Bardana update fails
    }
    
    res.status(201).json({
      success: true,
      data: sale.getFormattedDetails(),
      message: 'Sale created successfully'
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    
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
      error: 'Failed to create sale'
    });
  }
});

// PUT /api/sales/:id - Update sale
router.put('/:id', async (req, res) => {
  try {
    const { 
      partyName, 
      phoneNumber, 
      items, 
      date, 
      pdfUri 
    } = req.body;
    
    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }
    
    // Store original values for rollback
    const originalTotalAmount = sale.totalAmount;
    const originalItems = [...sale.items];
    
    // Update fields
    if (partyName) sale.partyName = partyName;
    if (phoneNumber) sale.phoneNumber = phoneNumber;
    if (items) sale.items = items;
    if (date) sale.date = date;
    if (pdfUri !== undefined) sale.pdfUri = pdfUri;
    
    await sale.save();
    
    // Update party balance if total amount changed
    if (sale.partyId && originalTotalAmount !== sale.totalAmount) {
      const balanceDifference = sale.totalAmount - originalTotalAmount;
      await Party.updateBalance(sale.partyId, balanceDifference, 'add');
    }
    
    // Update stock levels if items changed
    if (items && JSON.stringify(originalItems) !== JSON.stringify(items)) {
      // Restore original stock levels
      for (const originalItem of originalItems) {
        try {
          const item = await Item.findById(originalItem.id);
          if (item) {
            const quantityInBags = originalItem.quantity / 30;
            item.openingStock += quantityInBags;
            await item.save();
          }
        } catch (itemError) {
          console.error(`Error restoring stock for item ${originalItem.id}:`, itemError);
        }
      }
      
      // Apply new stock levels
      for (const saleItem of items) {
        try {
          const item = await Item.findById(saleItem.id);
          if (item) {
            const quantityInBags = saleItem.quantity / 30;
            item.openingStock -= quantityInBags;
            
            if (item.openingStock < 0) {
              item.openingStock = 0;
            }
            
            await item.save();
          }
        } catch (itemError) {
          console.error(`Error updating stock for item ${saleItem.id}:`, itemError);
        }
      }
    }
    
    res.json({
      success: true,
      data: sale.getFormattedDetails(),
      message: 'Sale updated successfully'
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    
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
      error: 'Failed to update sale'
    });
  }
});

// DELETE /api/sales/:id - Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }
    
    // Restore stock levels
    for (const saleItem of sale.items) {
      try {
        const item = await Item.findById(saleItem.id);
        if (item) {
          const quantityInBags = saleItem.quantity / 30;
          item.openingStock += quantityInBags;
          await item.save();
        }
      } catch (itemError) {
        console.error(`Error restoring stock for item ${saleItem.id}:`, itemError);
      }
    }
    
    // Restore Bardana stock
    try {
      const bardanaItem = await Item.findOne({ 
        isUniversal: true, 
        productName: 'Bardana' 
      });
      
      if (bardanaItem) {
        const totalKgSold = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const bardanaBagsToRestore = totalKgSold / 30;
        
        bardanaItem.openingStock += bardanaBagsToRestore;
        await bardanaItem.save();
      }
    } catch (bardanaError) {
      console.error('Error restoring Bardana stock:', bardanaError);
    }
    
    // Update party balance (subtract the amount)
    if (sale.partyId) {
      await Party.updateBalance(sale.partyId, sale.totalAmount, 'subtract');
    }
    
    await Sale.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sale'
    });
  }
});

// GET /api/sales/party/:partyName - Get sales by party name
router.get('/party/:partyName', async (req, res) => {
  try {
    const { partyName } = req.params;
    const { phoneNumber } = req.query;
    
    const sales = await Sale.getSalesByParty(partyName, phoneNumber);
    
    res.json({
      success: true,
      data: sales,
      count: sales.length
    });
  } catch (error) {
    console.error('Error fetching sales by party:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales by party'
    });
  }
});

// GET /api/sales/date-range - Get sales by date range
router.get('/date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const sales = await Sale.getSalesByDateRange(startDate, endDate);
    
    res.json({
      success: true,
      data: sales,
      count: sales.length
    });
  } catch (error) {
    console.error('Error fetching sales by date range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales by date range'
    });
  }
});

module.exports = router;
