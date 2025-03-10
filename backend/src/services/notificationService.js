const db = require('../utils/db');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/errorMiddleware');

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data) {
    try {
      const notification = await db.insert('Notifications', {
        ...data,
        read: false,
        createdAt: new Date()
      });

      // If real-time notifications are needed, emit socket event here
      // this.emitNotification(notification);

      logger.info('Notification created', { notificationId: notification.id });
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        type,
        read,
        startDate,
        endDate
      } = options;

      let conditions = { userId };

      if (type) conditions.type = type;
      if (typeof read === 'boolean') conditions.read = read;
      if (startDate) conditions.createdAt = { $gte: new Date(startDate) };
      if (endDate) conditions.createdAt = { ...conditions.createdAt, $lte: new Date(endDate) };

      const notifications = await db.findMany('Notifications', conditions, '*', {
        limit,
        offset,
        orderBy: 'createdAt DESC'
      });

      return notifications;
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await db.update('Notifications',
        { id: notificationId, userId },
        { read: true, updatedAt: new Date() }
      );

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      await db.query(
        'UPDATE Notifications SET read = @read, updatedAt = @updatedAt WHERE userId = @userId AND read = @unread',
        [true, new Date(), userId, false]
      );

      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      await db.delete('Notifications', { id: notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Create transaction notification
   */
  async createTransactionNotification(transaction) {
    const { userId, type, amount, status } = transaction;

    let title, message;
    switch (type) {
      case 'transfer':
        title = 'Transfer Completed';
        message = `Your transfer of $${amount} has been ${status}`;
        break;
      case 'deposit':
        title = 'Deposit Received';
        message = `$${amount} has been deposited into your account`;
        break;
      case 'withdrawal':
        title = 'Withdrawal Completed';
        message = `$${amount} has been withdrawn from your account`;
        break;
      default:
        title = 'Transaction Update';
        message = `Your transaction of $${amount} has been ${status}`;
    }

    return this.createNotification({
      userId,
      title,
      message,
      type: 'transaction',
      data: transaction
    });
  }

  /**
   * Create security notification
   */
  async createSecurityNotification(userId, event) {
    const { type, details } = event;

    let title, message;
    switch (type) {
      case 'login':
        title = 'New Login Detected';
        message = `New login detected from ${details.location} using ${details.device}`;
        break;
      case 'password_change':
        title = 'Password Changed';
        message = 'Your password was recently changed';
        break;
      case 'suspicious_activity':
        title = 'Suspicious Activity Detected';
        message = 'Unusual activity detected on your account';
        break;
      default:
        title = 'Security Alert';
        message = 'Important security update for your account';
    }

    return this.createNotification({
      userId,
      title,
      message,
      type: 'security',
      data: event
    });
  }

  /**
   * Create system notification
   */
  async createSystemNotification(userId, data) {
    return this.createNotification({
      userId,
      title: data.title,
      message: data.message,
      type: 'system',
      data
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM Notifications WHERE userId = @userId AND read = @read',
        [userId, false]
      );
      return result.recordset[0].count;
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  // Helper methods for real-time notifications if needed
  /*
  emitNotification(notification) {
    // Implement socket.io or similar for real-time notifications
    // io.to(notification.userId).emit('notification', notification);
  }
  */
}

module.exports = new NotificationService();
