const twilio = require('twilio');
const config = require('../config');
const logger = require('./logger');
const db = require('./db');

class SMSService {
  constructor() {
    if (config.twilio.enabled) {
      this.client = twilio(
        config.twilio.accountSid,
        config.twilio.authToken
      );
      this.fromNumber = config.twilio.phoneNumber;
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(to, message, options = {}) {
    if (!config.twilio.enabled) {
      logger.info('SMS service is disabled');
      return false;
    }

    try {
      const response = await this.client.messages.create({
        to,
        from: this.fromNumber,
        body: message,
        ...options
      });

      logger.info('SMS sent successfully', {
        messageId: response.sid,
        to: to
      });

      await this.logSMS({
        to,
        message,
        status: 'sent',
        messageId: response.sid
      });

      return true;
    } catch (error) {
      logger.error('Error sending SMS:', error);
      
      await this.logSMS({
        to,
        message,
        status: 'failed',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Log SMS
   */
  async logSMS(data) {
    try {
      await db.insert('SMSLogs', {
        ...data,
        createdAt: new Date()
      });
    } catch (error) {
      logger.error('Error logging SMS:', error);
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(phoneNumber, code) {
    const message = `Your verification code is: ${code}. Valid for 5 minutes.`;
    return this.sendSMS(phoneNumber, message, {
      messagingServiceSid: config.twilio.verificationServiceSid
    });
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(phoneNumber, alert) {
    const message = `Security Alert: ${alert.message}. If this wasn't you, please contact us immediately at ${config.support.phone}`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'high'
    });
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(phoneNumber, transaction) {
    const message = `Transaction Alert: ${transaction.type} of ${transaction.amount} ${transaction.currency} has been ${transaction.status}`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(phoneNumber, account) {
    const message = `Low Balance Alert: Your account ending in ${account.lastFour} has fallen below ${account.threshold} ${account.currency}`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send bill payment reminder
   */
  async sendBillPaymentReminder(phoneNumber, bill) {
    const message = `Payment Reminder: Your ${bill.billerName} bill of ${bill.amount} is due in ${bill.daysUntilDue} days`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send batch SMS
   */
  async sendBatchSMS(messages) {
    if (!config.twilio.enabled) {
      logger.info('SMS service is disabled');
      return false;
    }

    try {
      const results = await Promise.all(
        messages.map(msg => 
          this.sendSMS(msg.to, msg.message, msg.options)
        )
      );

      const successCount = results.filter(r => r === true).length;
      logger.info('Batch SMS sent', {
        total: messages.length,
        success: successCount,
        failed: messages.length - successCount
      });

      return successCount > 0;
    } catch (error) {
      logger.error('Error sending batch SMS:', error);
      return false;
    }
  }

  /**
   * Validate phone number
   */
  async validatePhoneNumber(phoneNumber) {
    if (!config.twilio.enabled) {
      return { isValid: true }; // Skip validation if service is disabled
    }

    try {
      const response = await this.client.lookups.v1
        .phoneNumbers(phoneNumber)
        .fetch({ type: ['carrier'] });

      return {
        isValid: true,
        phoneNumber: response.phoneNumber,
        countryCode: response.countryCode,
        carrier: response.carrier
      };
    } catch (error) {
      logger.error('Error validating phone number:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Get SMS status
   */
  async getSMSStatus(messageId) {
    if (!config.twilio.enabled) {
      return null;
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        status: message.status,
        error: message.errorMessage,
        sentAt: message.dateSent,
        updatedAt: message.dateUpdated
      };
    } catch (error) {
      logger.error('Error getting SMS status:', error);
      return null;
    }
  }

  /**
   * Get SMS history
   */
  async getSMSHistory(filters = {}) {
    try {
      const {
        phoneNumber,
        status,
        startDate,
        endDate,
        limit = 50
      } = filters;

      let conditions = {};
      if (phoneNumber) conditions.to = phoneNumber;
      if (status) conditions.status = status;
      if (startDate) conditions.createdAt = { $gte: new Date(startDate) };
      if (endDate) {
        conditions.createdAt = {
          ...conditions.createdAt,
          $lte: new Date(endDate)
        };
      }

      const logs = await db.findMany('SMSLogs', conditions, '*', {
        limit,
        orderBy: 'createdAt DESC'
      });

      return logs;
    } catch (error) {
      logger.error('Error getting SMS history:', error);
      return [];
    }
  }

  /**
   * Handle SMS webhook
   */
  async handleWebhook(data) {
    try {
      // Verify webhook signature if configured
      if (config.twilio.webhookSecret) {
        const signature = data.headers['x-twilio-signature'];
        const url = data.url;
        const params = data.body;

        const isValid = twilio.validateRequest(
          config.twilio.webhookSecret,
          signature,
          url,
          params
        );

        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Update SMS status in database
      await db.update('SMSLogs',
        { messageId: data.MessageSid },
        {
          status: data.MessageStatus,
          updatedAt: new Date()
        }
      );

      logger.info('SMS webhook processed', {
        messageId: data.MessageSid,
        status: data.MessageStatus
      });

      return true;
    } catch (error) {
      logger.error('Error handling SMS webhook:', error);
      return false;
    }
  }
}

module.exports = new SMSService();
