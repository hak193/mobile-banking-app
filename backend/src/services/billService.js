const db = require('../utils/db');
const logger = require('../utils/logger');
const { ValidationError, ResourceNotFoundError } = require('../middleware/errorMiddleware');

class BillService {
  /**
   * Get all billers
   */
  async getAllBillers(filters = {}) {
    try {
      const { category, status } = filters;
      let conditions = {};

      if (category) conditions.category = category;
      if (status) conditions.status = status;

      const billers = await db.findMany('Billers', conditions);
      return billers;
    } catch (error) {
      logger.error('Error fetching billers:', error);
      throw error;
    }
  }

  /**
   * Get user's saved billers
   */
  async getSavedBillers(userId) {
    try {
      const billers = await db.findMany('SavedBillers', { userId });
      return billers;
    } catch (error) {
      logger.error('Error fetching saved billers:', error);
      throw error;
    }
  }

  /**
   * Save new biller
   */
  async saveBiller(userId, billerData) {
    try {
      // Check if biller already saved
      const existingBiller = await db.findOne('SavedBillers', {
        userId,
        billerId: billerData.billerId
      });

      if (existingBiller) {
        throw new ValidationError('Biller already saved');
      }

      const savedBiller = await db.insert('SavedBillers', {
        userId,
        ...billerData,
        createdAt: new Date()
      });

      return savedBiller;
    } catch (error) {
      logger.error('Error saving biller:', error);
      throw error;
    }
  }

  /**
   * Process bill payment
   */
  async processBillPayment(userId, paymentData) {
    return await db.transaction(async (transaction) => {
      try {
        const {
          accountId,
          billerId,
          amount,
          reference,
          scheduledDate
        } = paymentData;

        // Validate biller
        const biller = await db.findOne('Billers', { id: billerId });
        if (!biller) {
          throw new ResourceNotFoundError('Biller not found');
        }

        // Create payment record
        const payment = await db.insert('BillPayments', {
          userId,
          accountId,
          billerId,
          amount,
          reference,
          status: scheduledDate ? 'scheduled' : 'pending',
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          createdAt: new Date()
        }, transaction);

        // If payment is immediate (not scheduled), process it now
        if (!scheduledDate) {
          // Process payment logic here
          // Update payment status
          await db.update('BillPayments',
            { id: payment.id },
            { status: 'completed', processedAt: new Date() },
            transaction
          );
        }

        logger.info('Bill payment processed', {
          paymentId: payment.id,
          userId,
          amount
        });

        return payment;
      } catch (error) {
        logger.error('Error processing bill payment:', error);
        throw error;
      }
    });
  }

  /**
   * Get bill payment history
   */
  async getBillPaymentHistory(userId, filters = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        status,
        billerId,
        startDate,
        endDate
      } = filters;

      let conditions = { userId };

      if (status) conditions.status = status;
      if (billerId) conditions.billerId = billerId;
      if (startDate) conditions.createdAt = { $gte: new Date(startDate) };
      if (endDate) conditions.createdAt = { ...conditions.createdAt, $lte: new Date(endDate) };

      const payments = await db.findMany('BillPayments', conditions, '*', {
        limit,
        offset,
        orderBy: 'createdAt DESC'
      });

      return payments;
    } catch (error) {
      logger.error('Error fetching bill payment history:', error);
      throw error;
    }
  }

  /**
   * Get scheduled payments
   */
  async getScheduledPayments(userId) {
    try {
      const payments = await db.findMany('BillPayments', {
        userId,
        status: 'scheduled',
        scheduledDate: { $gt: new Date() }
      });

      return payments;
    } catch (error) {
      logger.error('Error fetching scheduled payments:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled payment
   */
  async cancelScheduledPayment(userId, paymentId) {
    try {
      const payment = await db.findOne('BillPayments', {
        id: paymentId,
        userId,
        status: 'scheduled'
      });

      if (!payment) {
        throw new ResourceNotFoundError('Scheduled payment not found');
      }

      await db.update('BillPayments',
        { id: paymentId },
        {
          status: 'cancelled',
          updatedAt: new Date()
        }
      );

      return true;
    } catch (error) {
      logger.error('Error cancelling scheduled payment:', error);
      throw error;
    }
  }

  /**
   * Validate bill payment
   */
  async validateBillPayment(billerId, reference) {
    try {
      // Implement biller-specific validation logic here
      // This could involve calling external biller APIs

      return {
        valid: true,
        details: {
          amount: 0, // Some billers might return the amount due
          dueDate: null,
          customerName: ''
        }
      };
    } catch (error) {
      logger.error('Error validating bill payment:', error);
      throw error;
    }
  }

  /**
   * Get bill payment receipt
   */
  async getPaymentReceipt(userId, paymentId) {
    try {
      const payment = await db.findOne('BillPayments', {
        id: paymentId,
        userId,
        status: 'completed'
      });

      if (!payment) {
        throw new ResourceNotFoundError('Payment not found');
      }

      // Generate receipt data
      const receipt = {
        ...payment,
        receiptNumber: `RCP${payment.id}`,
        generatedAt: new Date()
      };

      return receipt;
    } catch (error) {
      logger.error('Error generating payment receipt:', error);
      throw error;
    }
  }
}

module.exports = new BillService();
