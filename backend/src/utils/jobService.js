const Queue = require('bull');
const config = require('../config');
const logger = require('./logger');
const emailService = require('./emailService');
const documentService = require('./documentService');
const metricsService = require('./metricsService');

class JobService {
  constructor() {
    // Initialize queues
    this.emailQueue = new Queue('email-queue', config.redis);
    this.statementQueue = new Queue('statement-queue', config.redis);
    this.cleanupQueue = new Queue('cleanup-queue', config.redis);
    this.metricsQueue = new Queue('metrics-queue', config.redis);
    this.notificationQueue = new Queue('notification-queue', config.redis);

    // Set up queue event handlers
    this.setupQueueHandlers(this.emailQueue);
    this.setupQueueHandlers(this.statementQueue);
    this.setupQueueHandlers(this.cleanupQueue);
    this.setupQueueHandlers(this.metricsQueue);
    this.setupQueueHandlers(this.notificationQueue);

    // Initialize job processors
    this.initializeProcessors();

    // Schedule recurring jobs
    this.scheduleRecurringJobs();
  }

  /**
   * Set up queue event handlers
   */
  setupQueueHandlers(queue) {
    queue.on('error', error => {
      logger.error(`Queue error in ${queue.name}:`, error);
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job failed in ${queue.name}:`, {
        jobId: job.id,
        error: error.message
      });
    });

    queue.on('completed', job => {
      logger.info(`Job completed in ${queue.name}:`, {
        jobId: job.id
      });
    });
  }

  /**
   * Initialize job processors
   */
  initializeProcessors() {
    // Email queue processor
    this.emailQueue.process(async job => {
      const { type, data } = job.data;
      await emailService[type](data);
    });

    // Statement queue processor
    this.statementQueue.process(async job => {
      const { userId, accountId, period } = job.data;
      await documentService.generateStatementPDF({
        userId,
        accountId,
        period
      });
    });

    // Cleanup queue processor
    this.cleanupQueue.process(async job => {
      const { type, days } = job.data;
      switch (type) {
        case 'documents':
          await documentService.cleanupOldDocuments(days);
          break;
        case 'metrics':
          await metricsService.cleanupOldMetrics(days);
          break;
      }
    });

    // Metrics queue processor
    this.metricsQueue.process(async job => {
      const { type, name, value, tags } = job.data;
      await metricsService[type](name, value, tags);
    });

    // Notification queue processor
    this.notificationQueue.process(async job => {
      const { type, data } = job.data;
      await this.processNotification(type, data);
    });
  }

  /**
   * Schedule recurring jobs
   */
  scheduleRecurringJobs() {
    // Daily statement generation at midnight
    this.statementQueue.add(
      'daily-statements',
      { type: 'daily' },
      { repeat: { cron: '0 0 * * *' }}
    );

    // Weekly cleanup at 1 AM on Sundays
    this.cleanupQueue.add(
      'weekly-cleanup',
      { type: 'all' },
      { repeat: { cron: '0 1 * * 0' }}
    );

    // Hourly metrics aggregation
    this.metricsQueue.add(
      'hourly-metrics',
      { type: 'aggregate' },
      { repeat: { cron: '0 * * * *' }}
    );
  }

  /**
   * Add email job
   */
  async addEmailJob(type, data, options = {}) {
    try {
      await this.emailQueue.add({ type, data }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        ...options
      });
    } catch (error) {
      logger.error('Error adding email job:', error);
      throw error;
    }
  }

  /**
   * Add statement generation job
   */
  async addStatementJob(data, options = {}) {
    try {
      await this.statementQueue.add(data, {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000
        },
        ...options
      });
    } catch (error) {
      logger.error('Error adding statement job:', error);
      throw error;
    }
  }

  /**
   * Add cleanup job
   */
  async addCleanupJob(type, days, options = {}) {
    try {
      await this.cleanupQueue.add({ type, days }, {
        attempts: 1,
        ...options
      });
    } catch (error) {
      logger.error('Error adding cleanup job:', error);
      throw error;
    }
  }

  /**
   * Add metrics job
   */
  async addMetricsJob(type, name, value, tags = {}, options = {}) {
    try {
      await this.metricsQueue.add({ type, name, value, tags }, {
        attempts: 2,
        ...options
      });
    } catch (error) {
      logger.error('Error adding metrics job:', error);
      throw error;
    }
  }

  /**
   * Add notification job
   */
  async addNotificationJob(type, data, options = {}) {
    try {
      await this.notificationQueue.add({ type, data }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        ...options
      });
    } catch (error) {
      logger.error('Error adding notification job:', error);
      throw error;
    }
  }

  /**
   * Process notification
   */
  async processNotification(type, data) {
    switch (type) {
      case 'transaction':
        await this.processTransactionNotification(data);
        break;
      case 'security':
        await this.processSecurityNotification(data);
        break;
      case 'system':
        await this.processSystemNotification(data);
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }

  /**
   * Process transaction notification
   */
  async processTransactionNotification(data) {
    // Send email notification
    await this.addEmailJob('sendTransactionConfirmation', data);

    // Send push notification if enabled
    if (data.pushEnabled) {
      // Implement push notification logic
    }

    // Record metrics
    await this.addMetricsJob('incrementCounter', 'notifications.sent', 1, {
      type: 'transaction'
    });
  }

  /**
   * Process security notification
   */
  async processSecurityNotification(data) {
    // Send email notification
    await this.addEmailJob('sendSecurityAlert', data);

    // Send SMS if enabled
    if (data.smsEnabled) {
      // Implement SMS notification logic
    }

    // Record metrics
    await this.addMetricsJob('incrementCounter', 'notifications.sent', 1, {
      type: 'security'
    });
  }

  /**
   * Process system notification
   */
  async processSystemNotification(data) {
    // Send email notification
    await this.addEmailJob('sendSystemNotification', data);

    // Record metrics
    await this.addMetricsJob('incrementCounter', 'notifications.sent', 1, {
      type: 'system'
    });
  }

  /**
   * Get queue status
   */
  async getQueueStatus(queueName) {
    const queue = this[`${queueName}Queue`];
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed
    };
  }

  /**
   * Clean queue
   */
  async cleanQueue(queueName) {
    const queue = this[`${queueName}Queue`];
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.clean(24 * 3600 * 1000); // Clean jobs older than 24 hours
    await queue.clean(24 * 3600 * 1000, 'failed'); // Clean failed jobs
  }
}

module.exports = new JobService();
