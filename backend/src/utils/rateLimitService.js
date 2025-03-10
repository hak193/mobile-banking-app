const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

class RateLimitService {
  constructor() {
    this.redis = new Redis(config.redis);
    this.defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests, please try again later.'
    };
  }

  /**
   * Check if request should be rate limited
   */
  async shouldRateLimit(key, options = {}) {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const now = Date.now();
      const windowStart = now - opts.windowMs;

      // Remove old requests outside the current window
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in the current window
      const requestCount = await this.redis.zcount(key, windowStart, now);

      if (requestCount >= opts.max) {
        return {
          limited: true,
          remaining: 0,
          resetTime: windowStart + opts.windowMs
        };
      }

      // Add current request
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry on the key
      await this.redis.expire(key, Math.ceil(opts.windowMs / 1000));

      return {
        limited: false,
        remaining: opts.max - requestCount - 1,
        resetTime: windowStart + opts.windowMs
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return { limited: false }; // Fail open if Redis is down
    }
  }

  /**
   * Generate rate limit key
   */
  generateKey(type, identifier) {
    return `ratelimit:${type}:${identifier}`;
  }

  /**
   * IP-based rate limiting
   */
  async checkIpLimit(ip, options = {}) {
    const key = this.generateKey('ip', ip);
    return this.shouldRateLimit(key, options);
  }

  /**
   * User-based rate limiting
   */
  async checkUserLimit(userId, options = {}) {
    const key = this.generateKey('user', userId);
    return this.shouldRateLimit(key, options);
  }

  /**
   * Endpoint-based rate limiting
   */
  async checkEndpointLimit(endpoint, identifier, options = {}) {
    const key = this.generateKey(`endpoint:${endpoint}`, identifier);
    return this.shouldRateLimit(key, options);
  }

  /**
   * Custom rate limiting for sensitive operations
   */
  async checkSensitiveOpLimit(operation, identifier, options = {}) {
    const sensitiveOps = {
      transfer: { windowMs: 60 * 60 * 1000, max: 10 }, // 10 transfers per hour
      password_change: { windowMs: 24 * 60 * 60 * 1000, max: 3 }, // 3 password changes per day
      login_attempts: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 login attempts per 15 minutes
      bill_payment: { windowMs: 60 * 60 * 1000, max: 20 }, // 20 bill payments per hour
      api_key_generation: { windowMs: 24 * 60 * 60 * 1000, max: 5 } // 5 API key generations per day
    };

    const defaultOpts = sensitiveOps[operation] || this.defaultOptions;
    const key = this.generateKey(`sensitive:${operation}`, identifier);
    return this.shouldRateLimit(key, { ...defaultOpts, ...options });
  }

  /**
   * Burst rate limiting
   */
  async checkBurstLimit(identifier, options = {}) {
    const burstOpts = {
      windowMs: 1000, // 1 second
      max: 5, // 5 requests per second
      ...options
    };

    const key = this.generateKey('burst', identifier);
    return this.shouldRateLimit(key, burstOpts);
  }

  /**
   * Clear rate limit for a key
   */
  async clearLimit(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Error clearing rate limit:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  async getLimitStatus(key) {
    try {
      const now = Date.now();
      const windowStart = now - this.defaultOptions.windowMs;
      
      // Get count of requests in current window
      const requestCount = await this.redis.zcount(key, windowStart, now);
      
      return {
        total: this.defaultOptions.max,
        remaining: Math.max(0, this.defaultOptions.max - requestCount),
        resetTime: windowStart + this.defaultOptions.windowMs
      };
    } catch (error) {
      logger.error('Error getting limit status:', error);
      return null;
    }
  }

  /**
   * Middleware factory for rate limiting
   */
  createLimitMiddleware(type, options = {}) {
    return async (req, res, next) => {
      try {
        const identifier = type === 'user' ? req.user?.id : req.ip;
        const result = await this[`check${type}Limit`](identifier, options);

        if (result.limited) {
          res.status(429).json({
            error: 'Too Many Requests',
            message: options.message || this.defaultOptions.message,
            resetTime: new Date(result.resetTime).toISOString()
          });
          return;
        }

        // Add rate limit info to response headers
        res.set({
          'X-RateLimit-Limit': options.max || this.defaultOptions.max,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': result.resetTime
        });

        next();
      } catch (error) {
        logger.error('Rate limit middleware error:', error);
        next(error);
      }
    };
  }
}

module.exports = new RateLimitService();
