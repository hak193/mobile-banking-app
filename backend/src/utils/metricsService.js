const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

class MetricsService {
  constructor() {
    this.redis = new Redis(config.redis);
    this.metricsPrefix = 'metrics:';
    this.defaultInterval = 60; // 1 minute in seconds
  }

  /**
   * Increment counter metric
   */
  async incrementCounter(name, value = 1, tags = {}) {
    try {
      const key = this.getMetricKey('counter', name, tags);
      await this.redis.incrby(key, value);
      return true;
    } catch (error) {
      logger.error('Metrics increment error:', error);
      return false;
    }
  }

  /**
   * Record gauge metric
   */
  async recordGauge(name, value, tags = {}) {
    try {
      const key = this.getMetricKey('gauge', name, tags);
      await this.redis.set(key, value);
      return true;
    } catch (error) {
      logger.error('Metrics gauge error:', error);
      return false;
    }
  }

  /**
   * Record histogram metric
   */
  async recordHistogram(name, value, tags = {}) {
    try {
      const key = this.getMetricKey('histogram', name, tags);
      await this.redis.rpush(key, value);
      return true;
    } catch (error) {
      logger.error('Metrics histogram error:', error);
      return false;
    }
  }

  /**
   * Start timer for duration metric
   */
  startTimer(name, tags = {}) {
    const startTime = process.hrtime();
    return {
      stop: async () => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
        return this.recordHistogram(name, duration, tags);
      }
    };
  }

  /**
   * Record API request metric
   */
  async recordAPIRequest(method, path, statusCode, duration, userId = null) {
    const tags = {
      method,
      path,
      statusCode: statusCode.toString(),
      userId: userId || 'anonymous'
    };

    await Promise.all([
      this.incrementCounter('api.requests.total', 1, tags),
      this.recordHistogram('api.requests.duration', duration, tags)
    ]);

    if (statusCode >= 400) {
      await this.incrementCounter('api.requests.errors', 1, tags);
    }
  }

  /**
   * Record database query metric
   */
  async recordDBQuery(operation, table, duration, success) {
    const tags = { operation, table, success: success.toString() };
    await Promise.all([
      this.incrementCounter('db.queries.total', 1, tags),
      this.recordHistogram('db.queries.duration', duration, tags)
    ]);
  }

  /**
   * Record user activity metric
   */
  async recordUserActivity(userId, activity, details = {}) {
    const tags = { userId, activity, ...details };
    await this.incrementCounter('user.activity', 1, tags);
  }

  /**
   * Record business metric
   */
  async recordBusinessMetric(name, value, tags = {}) {
    await Promise.all([
      this.recordGauge(`business.${name}`, value, tags),
      this.recordHistogram(`business.${name}.history`, value, tags)
    ]);
  }

  /**
   * Generate metric key
   */
  getMetricKey(type, name, tags = {}) {
    const tagString = Object.entries(tags)
      .map(([key, value]) => `${key}:${value}`)
      .join(':');
    return `${this.metricsPrefix}${type}:${name}${tagString ? ':' + tagString : ''}`;
  }

  /**
   * Get metric value
   */
  async getMetricValue(type, name, tags = {}) {
    try {
      const key = this.getMetricKey(type, name, tags);
      switch (type) {
        case 'counter':
        case 'gauge':
          return parseInt(await this.redis.get(key) || '0', 10);
        case 'histogram':
          const values = await this.redis.lrange(key, 0, -1);
          return values.map(v => parseFloat(v));
        default:
          throw new Error(`Unknown metric type: ${type}`);
      }
    } catch (error) {
      logger.error('Get metric error:', error);
      return null;
    }
  }

  /**
   * Calculate histogram statistics
   */
  calculateHistogramStats(values) {
    if (!values || values.length === 0) return null;

    values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p90: values[Math.floor(values.length * 0.9)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }

  /**
   * Get metrics for time window
   */
  async getMetricsForWindow(type, name, tags = {}, windowSeconds = 3600) {
    try {
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);
      const key = this.getMetricKey(type, name, tags);

      switch (type) {
        case 'counter':
          return await this.redis.get(key);
        case 'gauge':
          return await this.redis.get(key);
        case 'histogram':
          const values = await this.redis.lrange(key, 0, -1);
          return this.calculateHistogramStats(values.map(v => parseFloat(v)));
        default:
          throw new Error(`Unknown metric type: ${type}`);
      }
    } catch (error) {
      logger.error('Get metrics window error:', error);
      return null;
    }
  }

  /**
   * Middleware for tracking API metrics
   */
  createMetricsMiddleware() {
    return async (req, res, next) => {
      const startTime = process.hrtime();

      // Store original end function
      const originalEnd = res.end;

      // Override end function to capture metrics
      res.end = function(...args) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

        this.recordAPIRequest(
          req.method,
          req.path,
          res.statusCode,
          duration,
          req.user?.id
        ).catch(error => {
          logger.error('Metrics middleware error:', error);
        });

        originalEnd.apply(res, args);
      }.bind(this);

      next();
    };
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics(retentionDays = 30) {
    try {
      const keys = await this.redis.keys(`${this.metricsPrefix}*`);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      for (const key of keys) {
        const timestamp = await this.redis.get(`${key}:timestamp`);
        if (timestamp && (now - parseInt(timestamp, 10)) > retentionMs) {
          await this.redis.del(key, `${key}:timestamp`);
        }
      }
    } catch (error) {
      logger.error('Metrics cleanup error:', error);
    }
  }
}

module.exports = new MetricsService();
