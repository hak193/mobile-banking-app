const { performance, PerformanceObserver } = require('perf_hooks');
const config = require('../config');
const logger = require('./logger');
const metricsService = require('./metricsService');

class PerformanceService {
  constructor() {
    this.enabled = config.performance?.enabled || true;
    this.sampleRate = config.performance?.sampleRate || 0.1; // 10% sampling
    this.slowThreshold = config.performance?.slowThreshold || 1000; // 1 second
    this.observers = new Map();
    this.setupObservers();
  }

  /**
   * Setup performance observers
   */
  setupObservers() {
    if (!this.enabled) return;

    // Measure function execution time
    const measureObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.handleMeasurement(entry);
      });
    });
    measureObserver.observe({ entryTypes: ['measure'] });
    this.observers.set('measure', measureObserver);

    // Resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.handleResourceTiming(entry);
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', resourceObserver);
  }

  /**
   * Start measuring performance
   */
  startMeasure(name, labels = {}) {
    if (!this.enabled || !this.shouldSample()) return;

    const markName = `${name}_start`;
    performance.mark(markName);
    return markName;
  }

  /**
   * End measuring performance
   */
  endMeasure(name, startMark, labels = {}) {
    if (!this.enabled || !startMark) return;

    const endMark = `${name}_end`;
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);

    // Cleanup marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  }

  /**
   * Handle measurement entry
   */
  handleMeasurement(entry) {
    const duration = entry.duration;
    const name = entry.name;

    // Record metric
    metricsService.recordHistogram('performance.duration', duration, {
      name,
      slow: duration > this.slowThreshold
    });

    // Log slow operations
    if (duration > this.slowThreshold) {
      logger.warn('Slow operation detected:', {
        operation: name,
        duration,
        threshold: this.slowThreshold
      });
    }
  }

  /**
   * Handle resource timing entry
   */
  handleResourceTiming(entry) {
    const metrics = {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      connectTime: entry.connectEnd - entry.connectStart,
      ttfb: entry.responseStart - entry.requestStart,
      downloadTime: entry.responseEnd - entry.responseStart
    };

    // Record metrics
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && !isNaN(value)) {
        metricsService.recordHistogram(`resource.${key}`, value, {
          resource: entry.name
        });
      }
    });
  }

  /**
   * Create performance middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      if (!this.enabled || !this.shouldSample()) {
        return next();
      }

      const route = `${req.method} ${req.route?.path || req.path}`;
      const startMark = this.startMeasure(`http_request`, {
        route,
        method: req.method
      });

      // Track response time
      const start = process.hrtime();

      // Override end function to capture metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        this.endMeasure('http_request', startMark, {
          route,
          method: req.method,
          status: res.statusCode
        });

        // Record request metrics
        metricsService.recordHistogram('http.response_time', duration, {
          route,
          method: req.method,
          status: res.statusCode
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Create database query profiler
   */
  createQueryProfiler() {
    return async (query, params, callback) => {
      if (!this.enabled || !this.shouldSample()) {
        return callback(query, params);
      }

      const startMark = this.startMeasure('db_query');
      
      try {
        const result = await callback(query, params);
        this.endMeasure('db_query', startMark, {
          query: query.slice(0, 100) // Truncate long queries
        });
        return result;
      } catch (error) {
        this.endMeasure('db_query', startMark, {
          query: query.slice(0, 100),
          error: true
        });
        throw error;
      }
    };
  }

  /**
   * Create function profiler decorator
   */
  profileFunction(name) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function(...args) {
        if (!this.enabled || !this.shouldSample()) {
          return originalMethod.apply(this, args);
        }

        const startMark = this.startMeasure(`function_${name}`);
        
        try {
          const result = await originalMethod.apply(this, args);
          this.endMeasure(`function_${name}`, startMark);
          return result;
        } catch (error) {
          this.endMeasure(`function_${name}`, startMark, { error: true });
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Should sample this request
   */
  shouldSample() {
    return Math.random() < this.sampleRate;
  }

  /**
   * Get performance metrics
   */
  async getMetrics() {
    const metrics = await metricsService.getMetricsForWindow('histogram', 'performance.duration');
    return {
      httpRequests: {
        count: metrics.count,
        average: metrics.avg,
        p95: metrics.p95,
        p99: metrics.p99,
        slow: metrics.tags.slow || 0
      },
      resourceTiming: {
        // Add resource timing metrics
      },
      memory: {
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      },
      cpu: {
        user: process.cpuUsage().user,
        system: process.cpuUsage().system
      }
    };
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

module.exports = new PerformanceService();
