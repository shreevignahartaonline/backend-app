const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Party = require('../models/Party');

// Validation middleware
const validatePaymentData = (req, res, next) => {
  const { type, partyName, phoneNumber, amount, date } = req.body;
  
  // Check required fields
  if (!type || !partyName || !phoneNumber || !amount || !date) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: type, partyName, phoneNumber, amount, date'
    });
  }
  
  // Validate payment type
  if (!['payment-in', 'payment-out'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Payment type must be either payment-in or payment-out'
    });
  }
  
  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be a positive number'
    });
  }
  
  // Validate date format
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
    return res.status(400).json({
      success: false,
      error: 'Date must be in MM/DD/YYYY format'
    });
  }
  
  next();
};

// GET /api/payments - Get all payments
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      partyName, 
      phoneNumber, 
      startDate,
      endDate,
      search 
    } = req.query;
    
    const filter = {};
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (partyName) {
      filter.partyName = { $regex: partyName, $options: 'i' };
    }
    
    if (phoneNumber) {
      filter.phoneNumber = phoneNumber;
    }
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (search) {
      filter.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { paymentNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    const payments = await Payment.find(filter)
      .populate('partyId', 'name phoneNumber balance')
      .sort({ createdAt: -1 });
    
    // Transform for frontend compatibility
    const transformedPayments = payments.map(payment => ({
      ...payment.toObject(),
      id: payment._id.toString(),
      _id: undefined
    }));
    
    res.json({
      success: true,
      data: transformedPayments,
      count: transformedPayments.length
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    });
  }
});

// GET /api/payments/summary - Get payment summary
router.get('/summary', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    const summary = await Payment.getPaymentSummary(type, startDate, endDate);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment summary'
    });
  }
});

// GET /api/payments/:id - Get single payment
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('partyId', 'name phoneNumber balance');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    res.json({
      success: true,
      data: payment.getFormattedDetails()
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment'
    });
  }
});

// POST /api/payments - Create new payment
router.post('/', validatePaymentData, async (req, res) => {
  try {
    const { 
      type,
      partyName, 
      phoneNumber, 
      amount,
      totalAmount,
      date, 
      description,
      paymentMethod = 'cash',
      reference
    } = req.body;
    
    // Find or create party
    let party;
    try {
      party = await Party.findOrCreate({
        name: partyName,
        phoneNumber: phoneNumber
      });
    } catch (partyError) {
      console.error('Error with party:', partyError);
      // Continue without party reference if party creation fails
    }
    
    // Create payment using the static method
    const payment = await Payment.createPayment({
      type,
      partyName,
      phoneNumber,
      amount,
      totalAmount: totalAmount || amount,
      date,
      description: description || '',
      paymentMethod,
      reference: reference || '',
      partyId: party ? party._id : undefined
    });
    
    // Update party balance if party exists
    if (party) {
      try {
        await Payment.updatePartyBalance(payment);
      } catch (balanceError) {
        console.error('Error updating party balance:', balanceError);
        // Don't fail the payment creation if balance update fails
      }
    }
    
    res.status(201).json({
      success: true,
      data: payment.getFormattedDetails(),
      message: 'Payment created successfully'
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    
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
      error: 'Failed to create payment'
    });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', async (req, res) => {
  try {
    const { 
      partyName, 
      phoneNumber, 
      amount,
      totalAmount,
      date, 
      description,
      paymentMethod,
      reference
    } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    // Store original values for balance rollback
    const originalAmount = payment.amount;
    const originalPartyId = payment.partyId;
    
    // Update fields
    if (partyName) payment.partyName = partyName;
    if (phoneNumber) payment.phoneNumber = phoneNumber;
    if (amount !== undefined) payment.amount = amount;
    if (totalAmount !== undefined) payment.totalAmount = totalAmount;
    if (date) payment.date = date;
    if (description !== undefined) payment.description = description;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (reference !== undefined) payment.reference = reference;
    
    await payment.save();
    
    // Update party balance if amount changed
    if (originalAmount !== payment.amount && payment.partyId) {
      try {
        // Reverse the original payment
        const reverseOperation = 'add';
        await Party.updateBalance(originalPartyId, originalAmount, reverseOperation);
        
        // Apply the new payment
        await Payment.updatePartyBalance(payment);
      } catch (balanceError) {
        console.error('Error updating party balance:', balanceError);
        // Don't fail the update if balance update fails
      }
    }
    
    res.json({
      success: true,
      data: payment.getFormattedDetails(),
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    
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
      error: 'Failed to update payment'
    });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    // Reverse the party balance update
    if (payment.partyId) {
      try {
        const reverseOperation = 'add';
        await Party.updateBalance(payment.partyId, payment.amount, reverseOperation);
      } catch (balanceError) {
        console.error('Error reversing party balance:', balanceError);
        // Continue with deletion even if balance reversal fails
      }
    }
    
    await Payment.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment'
    });
  }
});

// POST /api/payments/cleanup - Clean up duplicate payments
router.post('/cleanup', async (req, res) => {
  try {
    const result = await Payment.cleanupDuplicates();
    
    res.json({
      success: true,
      message: 'Payment cleanup completed',
      data: result
    });
  } catch (error) {
    console.error('Error during payment cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup payments'
    });
  }
});

// GET /api/payments/type/:type - Get payments by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { partyName, phoneNumber, startDate, endDate, search } = req.query;
    
    if (!['payment-in', 'payment-out'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment type. Must be payment-in or payment-out'
      });
    }
    
    const options = {};
    if (partyName) options.partyName = partyName;
    if (phoneNumber) options.phoneNumber = phoneNumber;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const payments = await Payment.getPaymentsByType(type, options);
    
    // Transform for frontend compatibility
    const transformedPayments = payments.map(payment => ({
      ...payment.toObject(),
      id: payment._id.toString(),
      _id: undefined
    }));
    
    res.json({
      success: true,
      data: transformedPayments,
      count: transformedPayments.length
    });
  } catch (error) {
    console.error('Error fetching payments by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments by type'
    });
  }
});

module.exports = router;