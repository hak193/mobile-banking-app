const express = require('express');
const router = express.Router();
const accountService = require('../services/accountService');
const { protect, require2FA, rateLimitSensitiveOps } = require('../middleware/authMiddleware');
const { ValidationError } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

/**
 * @route   GET /api/accounts
 * @desc    Get user's accounts
 * @access  Private
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const accounts = await accountService.getUserAccounts(req.user.id);
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/accounts/:accountId
 * @desc    Get account details
 * @access  Private
 */
router.get('/:accountId', protect, async (req, res, next) => {
  try {
    const account = await accountService.getAccountDetails(
      req.params.accountId,
      req.user.id
    );
    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/accounts/:accountId/balance
 * @desc    Get account balance
 * @access  Private
 */
router.get('/:accountId/balance', protect, async (req, res, next) => {
  try {
    const balance = await accountService.getAccountBalance(
      req.params.accountId,
      req.user.id
    );
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/accounts/transfer
 * @desc    Transfer funds between accounts
 * @access  Private
 */
router.post('/transfer', [
  protect,
  require2FA,
  rateLimitSensitiveOps
], async (req, res, next) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;

    // Validate required fields
    if (!fromAccountId || !toAccountId || !amount) {
      throw new ValidationError('Please provide all required fields');
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Please provide a valid amount');
    }

    const transfer = await accountService.transferFunds(
      req.user.id,
      {
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        description
      }
    );

    logger.info('Transfer completed', {
      userId: req.user.id,
      transferId: transfer.id,
      amount
    });

    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/accounts/:accountId/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/:accountId/transactions', protect, async (req, res, next) => {
  try {
    const {
      limit,
      offset,
      startDate,
      endDate,
      type,
      status
    } = req.query;

    const transactions = await accountService.getTransactionHistory(
      req.params.accountId,
      req.user.id,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        startDate,
        endDate,
        type,
        status
      }
    );

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/accounts/bill-payment
 * @desc    Process bill payment
 * @access  Private
 */
router.post('/bill-payment', [
  protect,
  rateLimitSensitiveOps
], async (req, res, next) => {
  try {
    const { accountId, billerId, amount, reference } = req.body;

    // Validate required fields
    if (!accountId || !billerId || !amount) {
      throw new ValidationError('Please provide all required fields');
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Please provide a valid amount');
    }

    const payment = await accountService.processBillPayment(
      req.user.id,
      {
        accountId,
        billerId,
        amount: parseFloat(amount),
        reference
      }
    );

    logger.info('Bill payment completed', {
      userId: req.user.id,
      paymentId: payment.id,
      amount
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
 * @route   GET /api/accounts/:accountId/statements
 * @desc    Get account statements
 * @access  Private
 */
router.get('/:accountId/statements', protect, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date range
    if (!startDate || !endDate) {
      throw new ValidationError('Please provide start and end dates');
    }

    const statements = await accountService.getAccountStatements(
      req.params.accountId,
      req.user.id,
      {
        startDate,
        endDate
      }
    );

    res.json({
      success: true,
      data: statements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/accounts/:accountId/statement/download
 * @desc    Download account statement
 * @access  Private
 */
router.get('/:accountId/statement/download', protect, async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'pdf' } = req.query;

    // Validate date range
    if (!startDate || !endDate) {
      throw new ValidationError('Please provide start and end dates');
    }

    // Validate format
    if (!['pdf', 'csv'].includes(format)) {
      throw new ValidationError('Invalid format specified');
    }

    const statement = await accountService.generateStatement(
      req.params.accountId,
      req.user.id,
      {
        startDate,
        endDate,
        format
      }
    );

    // Set headers for file download
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=statement.${format}`);

    res.send(statement);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
