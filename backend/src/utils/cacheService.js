const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

class CacheService {
  constructor() {
    this.redis = new Redis(config.redis);
    this.defaultTTL = 3600; // 1 hour in seconds

    // Default cache times for different types of data
    this.cacheTimes = {
      user: 3600, // 1 hour
      account: 300, // 5 minutes
      transaction: 300, // 5 minutes
      statement: 86400, // 24 hours
      notification: 300, // 5 minutes
      biller: 86400, // 24 hours
      staticData: 86400 * 7 // 7 days
    };
  }

  /**
   * Generate cache key
   */
  generateKey(type, identifier) {
    return `cache:${type}:${identifier}`;
  }

  /**
   * Set cache data
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const serializedData = JSON.stringify(data);
      await this.redis.setex(key, ttl, serializedData);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cache data
   */
  async get(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete cache data
   */
  async delete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache clear pattern error:', error);
      return false;
    }
  }

  /**
   * Cache user data
   */
  async cacheUser(userId, userData) {
    const key = this.generateKey('user', userId);
    return this.set(key, userData, this.cacheTimes.user);
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId) {
    const key = this.generateKey('user', userId);
    return this.get(key);
  }

  /**
   * Cache account data
   */
  async cacheAccount(accountId, accountData) {
    const key = this.generateKey('account', accountId);
    return this.set(key, accountData, this.cacheTimes.account);
  }

  /**
   * Get cached account data
   */
  async getCachedAccount(accountId) {
    const key = this.generateKey('account', accountId);
    return this.get(key);
  }

  /**
   * Cache transaction data
   */
  async cacheTransaction(transactionId, transactionData) {
    const key = this.generateKey('transaction', transactionId);
    return this.set(key, transactionData, this.cacheTimes.transaction);
  }

  /**
   * Get cached transaction data
   */
  async getCachedTransaction(transactionId) {
    const key = this.generateKey('transaction', transactionId);
    return this.get(key);
  }

  /**
   * Cache with version control
   */
  async setVersioned(key, data, version, ttl = this.defaultTTL) {
    const versionedData = {
      version,
      data,
      timestamp: Date.now()
    };
    return this.set(key, versionedData, ttl);
  }

  /**
   * Get versioned cache data
   */
  async getVersioned(key, currentVersion) {
    const cached = await this.get(key);
    if (!cached || cached.version !== currentVersion) {
      return null;
    }
    return cached.data;
  }

  /**
   * Cache with tags
   */
  async setWithTags(key, data, tags = [], ttl = this.defaultTTL) {
    try {
      // Store the data
      await this.set(key, data, ttl);

      // Store key-tag associations
      for (const tag of tags) {
        await this.redis.sadd(`tag:${tag}`, key);
      }

      return true;
    } catch (error) {
      logger.error('Cache set with tags error:', error);
      return false;
    }
  }

  /**
   * Clear cache by tag
   */
  async clearByTag(tag) {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(keys);
        await this.redis.del(`tag:${tag}`);
      }
      return true;
    } catch (error) {
      logger.error('Cache clear by tag error:', error);
      return false;
    }
  }

  /**
   * Cache middleware factory
   */
  createCacheMiddleware(type, ttl = null) {
    return async (req, res, next) => {
      try {
        const cacheKey = this.generateKey(type, req.originalUrl);
        const cachedData = await this.get(cacheKey);

        if (cachedData) {
          return res.json(cachedData);
        }

        // Store original send function
        const originalSend = res.send;

        // Override send function to cache response
        res.send = function(body) {
          try {
            const data = JSON.parse(body);
            this.set(cacheKey, data, ttl || this.cacheTimes[type]);
          } catch (error) {
            logger.error('Cache middleware error:', error);
          }
          
          // Call original send function
          originalSend.call(this, body);
        }.bind(this);

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(data) {
    try {
      const promises = Object.entries(data).map(([key, value]) => {
        return this.set(key, value, this.cacheTimes[value.type]);
      });

      await Promise.all(promises);
      logger.info('Cache warmup completed');
      return true;
    } catch (error) {
      logger.error('Cache warmup error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const testKey = 'health:check';
      const testValue = 'ok';
      
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      logger.error('Cache health check error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
