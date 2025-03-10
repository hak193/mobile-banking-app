const db = require('../utils/db');
const logger = require('../utils/logger');
const { ValidationError, ResourceNotFoundError } = require('../middleware/errorMiddleware');

class AccountService {
  /**
   * Get user's accounts
   */
  async getUserAccounts(userId) {
    try {
      const accounts = await db.findMany('Accounts', { userId });
      return accounts;
    } catch (error) {
      logger.error('Error fetching user accounts:', error);
      throw error;
    }
  }

  /**
   * Get account details
   */
  async getAccountDetails(accountId, userId) {
    try {
      const account = await db.findOne('Accounts', { id: accountId, userId });
      if (!account) {
        throw new ResourceNotFoundError('Account not found');
      }
      return account;
    } catch (error) {
      logger.error('Error fetching account details:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId, userId) {
    try {
      const account = await this.getAccountDetails(accountId, userId);
      return {
        balance: account.balance,
        availableBalance: account.balance - account.holdAmount,
        currency: account.currency,
        lastUpdated: account.updatedAt
      };
    } catch (error) {
      logger.error('Error fetching account balance:', error);
      throw error;
    }
  }

  /**
   * Process fund transfer
   */
  async transferFunds(userId, { fromAccountId, toAccountId, amount, description }) {
    return await db.transaction(async (transaction) => {
      try {
        // Validate amount
        if (amount <= 0) {
          throw new ValidationError('Invalid transfer amount');
        }

        // Get source account
        const sourceAccount = await this.getAccountDetails(fromAccountId, userId);
        if (sourceAccount.balance < amount) {
          throw new ValidationError('Insufficient funds');
        }

        // Get destination account
        const destAccount = await db.findOne('Accounts', { id: toAccountId });
        if (!destAccount) {
          throw new ResourceNotFoundError('Destination account not found');
        }

        // Create transaction record
        const transferTx = await db.insert('Transactions', {
          fromAccountId,
          toAccountId,
          amount,
          type: 'transfer',
          status: 'completed',
          description,
          userId,
          createdAt: new Date()
        }, transaction);

        // Update account balances
        await db.query(
          'UPDATE Accounts SET balance = balance - @amount WHERE id = @fromId',
          [amount, fromAccountId],
          transaction
        );

        await db.query(
          'UPDATE Accounts SET balance = balance + @amount WHERE id = @toId',
          [amount, toAccountId],
          transaction
        );

        logger.info('Transfer completed successfully', {
          transferId: transferTx.id,
          userId,
          amount
        });

        return transferTx;
      } catch (error) {
        logger.error('Transfer failed:', error);
        throw error;
      }
    });
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(accountId, userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        startDate,
        endDate,
        type,
        status
      } = options;

      let conditions = { accountId, userId };

      if (startDate) conditions.createdAt = { $gte: new Date(startDate) };
      if (endDate) conditions.createdAt = { ...conditions.createdAt, $lte: new Date(endDate) };
      if (type) conditions.type = type;
      if (status) conditions.status = status;

      const transactions = await db.findMany('Transactions', conditions, '*', {
        limit,
        offset,
        orderBy: 'createdAt DESC'
      });

      return transactions;
    } catch (error) {
      logger.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Process bill payment
   */
  async processBillPayment(userId, { accountId, billerId, amount, reference }) {
    return await db.transaction(async (transaction) => {
      try {
        // Validate amount
        if (amount <= 0) {
          throw new ValidationError('Invalid payment amount');
        }

        // Get account
        const account = await this.getAccountDetails(accountId, userId);
        if (account.balance < amount) {
          throw new ValidationError('Insufficient funds');
        }

        // Create payment record
        const payment = await db.insert('BillPayments', {
          accountId,
          billerId,
          amount,
          reference,
          status: 'completed',
          userId,
          createdAt: new Date()
        }, transaction);

        // Update account balance
        await db.query(
          'UPDATE Accounts SET balance = balance - @amount WHERE id = @accountId',
          [amount, accountId],
          transaction
        );

        logger.info('Bill payment completed successfully', {
          paymentId: payment.id,
          userId,
          amount
        });

        return payment;
      } catch (error) {
        logger.error('Bill payment failed:', error);
        throw error;
      }
    });
  }

  /**
   * Get account statements
   */
  async getAccountStatements(accountId, userId, { startDate, endDate }) {
    try {
      const statements = await db.findMany('Statements', {
        accountId,
        userId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      return statements;
    } catch (error) {
      logger.error('Error fetching account statements:', error);
      throw error;
    }
  }
}

module.exports = new AccountService();
