const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { protect } = require('../middleware/authMiddleware');
const { ValidationError } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const {
      limit,
      offset,
      type,
      read,
      startDate,
      endDate
    } = req.query;

    const notifications = await notificationService.getUserNotifications(
      req.user.id,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        type,
        read: read === 'true',
        startDate,
        endDate
      }
    );

    // Get unread count
    const unreadCount = await notificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', protect, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await notificationService.deleteNotification(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', protect, async (req, res, next) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.user.id);
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', protect, async (req, res, next) => {
  try {
    const { preferences } = req.body;

    if (!preferences) {
      throw new ValidationError('Please provide notification preferences');
    }

    const updatedPreferences = await notificationService.updateNotificationPreferences(
      req.user.id,
      preferences
    );

    res.json({
      success: true,
      data: updatedPreferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (development only)
 * @access  Private
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', protect, async (req, res, next) => {
    try {
      const { type = 'system' } = req.body;

      let notification;
      switch (type) {
        case 'transaction':
          notification = await notificationService.createTransactionNotification({
            userId: req.user.id,
            type: 'transfer',
            amount: 100,
            status: 'completed'
          });
          break;
        case 'security':
          notification = await notificationService.createSecurityNotification(
            req.user.id,
            {
              type: 'login',
              details: {
                location: 'New York, US',
                device: 'iPhone 12'
              }
            }
          );
          break;
        default:
          notification = await notificationService.createSystemNotification(
            req.user.id,
            {
              title: 'Test Notification',
              message: 'This is a test notification'
            }
          );
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = router;
