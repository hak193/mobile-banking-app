const express = require('express');
const router = express.Router();
const billService = require('../services/billService');
const { protect, rateLimitSensitiveOps } = require('../middleware/authMiddleware');
const { ValidationError } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

/**
 * @route   GET /api/bills/billers
 * @desc    Get all billers
 * @access  Private
 */
router.get('/billers', protect, async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const billers = await billService.getAllBillers({ category, status });
    res.json({
      success: true,
      data: billers
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/bills/saved-billers
 * @desc    Get user's saved billers
 * @access  Private
 */
router.get('/saved-billers', protect, async (req, res, next) => {
  try {
    const billers = await billService.getSavedBillers(req.user.id);
    res.json({
      success: true,
      data: billers
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/bills/save-biller
 * @desc    Save new biller
 * @access  Private
 */
router.post('/save-biller', protect, async (req, res, next) => {
  try {
    const { billerId, nickname, accountNumber } = req.body;

    if (!billerId || !accountNumber) {
      throw new ValidationError('Please provide all required fields');
    }

    const savedBiller = await billService.saveBiller(req.user.id, {
      billerId,
      nickname,
      accountNumber
    });

    res.json({
      success: true,
      data: savedBiller
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/bills/pay
 * @desc    Process bill payment
 * @access  Private
 */
router.post('/pay', [protect, rateLimitSensitiveOps], async (req, res, next) => {
  try {
    const {
      accountId,
      billerId,
      amount,
      reference,
      scheduledDate
    } = req.body;

    // Validate required fields
    if (!accountId || !billerId || !amount) {
      throw new ValidationError('Please provide all required fields');
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Please provide a valid amount');
    }

    // Validate scheduled date if provided
    if (scheduledDate && new Date(scheduledDate) < new Date()) {
      throw new ValidationError('Scheduled date must be in the future');
    }

    const payment = await billService.processBillPayment(req.user.id, {
      accountId,
      billerId,
      amount: parseFloat(amount),
      reference,
      scheduledDate
    });

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/bills/payment-history
 * @desc    Get bill payment history
 * @access  Private
 */
router.get('/payment-history', protect, async (req, res, next) => {
  try {
    const {
      limit,
      offset,
      status,
      billerId,
      startDate,
      endDate
    } = req.query;

    const payments = await billService.getBillPaymentHistory(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      billerId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/bills/scheduled-payments
 * @desc    Get scheduled payments
 * @access  Private
 */
router.get('/scheduled-payments', protect, async (req, res, next) => {
  try {
    const payments = await billService.getScheduledPayments(req.user.id);
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/bills/cancel-scheduled/:paymentId
 * @desc    Cancel scheduled payment
 * @access  Private
 */
router.post('/cancel-scheduled/:paymentId', protect, async (req, res, next) => {
  try {
    await billService.cancelScheduledPayment(req.user.id, req.params.paymentId);
    res.json({
      success: true,
      message: 'Scheduled payment cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/bills/validate
 * @desc    Validate bill payment
 * @access  Private
 */
router.post('/validate', protect, async (req, res, next) => {
  try {
    const { billerId, reference } = req.body;

    if (!billerId || !reference) {
      throw new ValidationError('Please provide all required fields');
    }

    const validation = await billService.validateBillPayment(billerId, reference);
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/bills/receipt/:paymentId
 * @desc    Get payment receipt
 * @access  Private
 */
router.get('/receipt/:paymentId', protect, async (req, res, next) => {
  try {
    const receipt = await billService.getPaymentReceipt(
      req.user.id,
      req.params.paymentId
    );

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/bills/saved-billers/:billerId
 * @desc    Remove saved biller
 * @access  Private
 */
router.delete('/saved-billers/:billerId', protect, async (req, res, next) => {
  try {
    await billService.removeSavedBiller(req.user.id, req.params.billerId);
    res.json({
      success: true,
      message: 'Biller removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
