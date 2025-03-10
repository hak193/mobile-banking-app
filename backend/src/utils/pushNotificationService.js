const admin = require('firebase-admin');
const config = require('../config');
const logger = require('./logger');
const db = require('./db');

class PushNotificationService {
  constructor() {
    if (config.features.enablePushNotifications) {
      admin.initializeApp({
        credential: admin.credential.cert(config.firebase.serviceAccount),
        projectId: config.firebase.projectId
      });
      this.messaging = admin.messaging();
    }
  }

  /**
   * Save device token
   */
  async saveDeviceToken(userId, token, deviceInfo) {
    try {
      await db.insert('DeviceTokens', {
        userId,
        token,
        deviceType: deviceInfo.type,
        deviceModel: deviceInfo.model,
        platform: deviceInfo.platform,
        createdAt: new Date()
      });

      logger.info('Device token saved', { userId, deviceType: deviceInfo.type });
      return true;
    } catch (error) {
      logger.error('Error saving device token:', error);
      throw error;
    }
  }

  /**
   * Remove device token
   */
  async removeDeviceToken(userId, token) {
    try {
      await db.delete('DeviceTokens', { userId, token });
      logger.info('Device token removed', { userId });
      return true;
    } catch (error) {
      logger.error('Error removing device token:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendNotification(token, notification, data = {}) {
    if (!config.features.enablePushNotifications) {
      logger.info('Push notifications are disabled');
      return false;
    }

    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          ...data,
          clickAction: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: notification.channelId || 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      logger.info('Push notification sent successfully', { messageId: response });
      return true;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send notification to user
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      const tokens = await this.getUserTokens(userId);
      if (!tokens.length) {
        logger.info('No device tokens found for user', { userId });
        return false;
      }

      const results = await Promise.all(
        tokens.map(token => this.sendNotification(token, notification, data))
      );

      return results.some(result => result === true);
    } catch (error) {
      logger.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Get user device tokens
   */
  async getUserTokens(userId) {
    try {
      const devices = await db.findMany('DeviceTokens', { userId });
      return devices.map(device => device.token);
    } catch (error) {
      logger.error('Error getting user tokens:', error);
      return [];
    }
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(userId, transaction) {
    const notification = {
      title: 'Transaction Alert',
      body: `${transaction.type} of ${transaction.amount} ${transaction.currency} has been ${transaction.status}`,
      channelId: 'transactions',
      clickAction: 'TRANSACTION_DETAILS'
    };

    const data = {
      transactionId: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(),
      status: transaction.status
    };

    return this.sendToUser(userId, notification, data);
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(userId, alert) {
    const notification = {
      title: 'Security Alert',
      body: alert.message,
      channelId: 'security',
      clickAction: 'SECURITY_ALERT'
    };

    const data = {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity
    };

    return this.sendToUser(userId, notification, data);
  }

  /**
   * Send bill payment reminder
   */
  async sendBillPaymentReminder(userId, bill) {
    const notification = {
      title: 'Bill Payment Reminder',
      body: `Your ${bill.billerName} bill of ${bill.amount} is due in ${bill.daysUntilDue} days`,
      channelId: 'bills',
      clickAction: 'BILL_PAYMENT'
    };

    const data = {
      billId: bill.id,
      billerName: bill.billerName,
      amount: bill.amount.toString(),
      dueDate: bill.dueDate
    };

    return this.sendToUser(userId, notification, data);
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(userId, account) {
    const notification = {
      title: 'Low Balance Alert',
      body: `Your account balance has fallen below ${account.threshold} ${account.currency}`,
      channelId: 'accounts',
      clickAction: 'ACCOUNT_DETAILS'
    };

    const data = {
      accountId: account.id,
      balance: account.balance.toString(),
      threshold: account.threshold.toString()
    };

    return this.sendToUser(userId, notification, data);
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(notifications) {
    if (!config.features.enablePushNotifications) {
      logger.info('Push notifications are disabled');
      return false;
    }

    try {
      const messages = notifications.map(n => ({
        token: n.token,
        notification: {
          title: n.title,
          body: n.body
        },
        data: n.data || {}
      }));

      const response = await this.messaging.sendAll(messages);
      logger.info('Batch notifications sent', {
        success: response.successCount,
        failure: response.failureCount
      });

      return response.successCount > 0;
    } catch (error) {
      logger.error('Error sending batch notifications:', error);
      return false;
    }
  }

  /**
   * Clean up invalid tokens
   */
  async cleanupInvalidTokens() {
    try {
      const tokens = await db.findMany('DeviceTokens');
      const batchSize = 500;
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const messages = batch.map(t => ({
          token: t.token,
          notification: { title: 'Test' }
        }));

        const response = await this.messaging.sendAll(messages);
        
        // Remove tokens that failed due to being invalid
        const failedTokens = response.responses
          .map((r, index) => r.error ? batch[index].token : null)
          .filter(Boolean);

        if (failedTokens.length > 0) {
          await db.delete('DeviceTokens', {
            token: { $in: failedTokens }
          });
          
          logger.info('Removed invalid tokens', {
            count: failedTokens.length
          });
        }
      }

      return true;
    } catch (error) {
      logger.error('Error cleaning up invalid tokens:', error);
      return false;
    }
  }
}

module.exports = new PushNotificationService();
