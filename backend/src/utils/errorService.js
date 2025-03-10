const Sentry = require('@sentry/node');
const config = require('../config');
const logger = require('./logger');

class ErrorService {
  constructor() {
    if (config.services.sentry.dsn) {
      Sentry.init({
        dsn: config.services.sentry.dsn,
        environment: config.env,
        release: process.env.npm_package_version,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: true }),
          new Sentry.Integrations.OnUncaughtException(),
          new Sentry.Integrations.OnUnhandledRejection()
        ],
        tracesSampleRate: config.env === 'production' ? 0.1 : 1.0,
        beforeSend: this.beforeSend.bind(this)
      });
    }
  }

  /**
   * Filter sensitive data before sending to Sentry
   */
  beforeSend(event) {
    if (event.request && event.request.data) {
      // Remove sensitive data from request
      const sanitizedData = this.sanitizeData(event.request.data);
      event.request.data = sanitizedData;
    }

    if (event.extra) {
      // Remove sensitive data from extra context
      event.extra = this.sanitizeData(event.extra);
    }

    return event;
  }

  /**
   * Sanitize sensitive data
   */
  sanitizeData(data) {
    const sensitiveFields = [
      'password',
      'token',
      'creditCard',
      'ssn',
      'accountNumber',
      'routingNumber'
    ];

    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Capture error
   */
  captureError(error, context = {}) {
    try {
      if (!config.services.sentry.dsn) {
        logger.error('Error captured (Sentry disabled):', error);
        return null;
      }

      const scope = new Sentry.Scope();

      // Add user context if available
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email
        });
      }

      // Add additional context
      if (context.tags) {
        scope.setTags(context.tags);
      }
      if (context.extra) {
        scope.setExtras(context.extra);
      }

      // Set error level
      if (context.level) {
        scope.setLevel(context.level);
      }

      // Capture error with scope
      const eventId = Sentry.captureException(error, scope);
      
      logger.error('Error captured and sent to Sentry:', {
        eventId,
        error: error.message
      });

      return eventId;
    } catch (err) {
      logger.error('Error capturing error in Sentry:', err);
      return null;
    }
  }

  /**
   * Capture message
   */
  captureMessage(message, context = {}) {
    try {
      if (!config.services.sentry.dsn) {
        logger.info('Message captured (Sentry disabled):', message);
        return null;
      }

      const scope = new Sentry.Scope();

      // Add context
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email
        });
      }
      if (context.tags) {
        scope.setTags(context.tags);
      }
      if (context.extra) {
        scope.setExtras(context.extra);
      }
      if (context.level) {
        scope.setLevel(context.level);
      }

      // Capture message with scope
      const eventId = Sentry.captureMessage(message, scope);
      
      logger.info('Message captured and sent to Sentry:', {
        eventId,
        message
      });

      return eventId;
    } catch (error) {
      logger.error('Error capturing message in Sentry:', error);
      return null;
    }
  }

  /**
   * Set user context
   */
  setUser(user) {
    if (config.services.sentry.dsn) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username
      });
    }
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (config.services.sentry.dsn) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb) {
    if (config.services.sentry.dsn) {
      Sentry.addBreadcrumb({
        timestamp: Date.now() / 1000,
        ...breadcrumb
      });
    }
  }

  /**
   * Create error handling middleware
   */
  createErrorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only report errors with status code >= 500
        return !error.status || error.status >= 500;
      }
    });
  }

  /**
   * Create request handler middleware
   */
  createRequestHandler() {
    return Sentry.Handlers.requestHandler({
      // Only handle errors for these HTTP methods
      methods: ['POST', 'PUT', 'DELETE', 'PATCH']
    });
  }

  /**
   * Create trace handler middleware
   */
  createTraceHandler() {
    return Sentry.Handlers.tracingHandler();
  }

  /**
   * Format error for API response
   */
  formatError(error) {
    const response = {
      error: {
        message: error.message || 'Internal Server Error',
        code: error.code || 'INTERNAL_ERROR'
      }
    };

    // Add stack trace in development
    if (config.env === 'development') {
      response.error.stack = error.stack;
    }

    // Add error details if available
    if (error.details) {
      response.error.details = error.details;
    }

    return response;
  }

  /**
   * Log error details
   */
  logError(error, context = {}) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...context
    };

    if (error.status >= 500) {
      logger.error('Server error:', errorDetails);
    } else {
      logger.warn('Client error:', errorDetails);
    }

    // Capture in Sentry if it's a server error
    if (error.status >= 500) {
      this.captureError(error, context);
    }
  }

  /**
   * Create custom error
   */
  createError(message, code, status = 500) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
  }
}

module.exports = new ErrorService();
