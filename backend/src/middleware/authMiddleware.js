const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { AuthenticationError, AuthorizationError } = require('./errorMiddleware');
const { getUserById } = require('../services/userService');

/**
 * Verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from database and attach to request
      // Exclude password from the user object
      const user = await getUserById(decoded.id);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Check if token was issued before password change
      if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
        throw new AuthenticationError('Password recently changed, please login again');
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Grant access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('Not authorized to access this resource');
    }
    next();
  };
};

/**
 * Rate limiting for sensitive operations
 */
const rateLimitSensitiveOps = async (req, res, next) => {
  try {
    const key = `rateLimit:${req.user.id}:${req.originalUrl}`;
    // Implementation would depend on your caching solution (Redis, etc.)
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA token for sensitive operations
 */
const require2FA = async (req, res, next) => {
  try {
    const { twoFactorToken } = req.body;

    if (!req.user.twoFactorEnabled) {
      return next();
    }

    if (!twoFactorToken) {
      throw new AuthenticationError('2FA token required');
    }

    // Verify 2FA token
    // Implementation would depend on your 2FA solution
    const isValid = await verify2FAToken(req.user.id, twoFactorToken);
    
    if (!isValid) {
      throw new AuthenticationError('Invalid 2FA token');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Log security events
 */
const logSecurityEvent = (eventType) => {
  return (req, res, next) => {
    logger.logSecurityEvent({
      type: eventType,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    next();
  };
};

/**
 * Validate session status
 */
const validateSession = async (req, res, next) => {
  try {
    // Check if user's session is still valid
    const isSessionValid = await checkSessionValidity(req.user.id, req.headers['session-id']);
    
    if (!isSessionValid) {
      throw new AuthenticationError('Session expired');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Helper functions
const verify2FAToken = async (userId, token) => {
  // Implement 2FA verification logic
  return true; // Placeholder
};

const checkSessionValidity = async (userId, sessionId) => {
  // Implement session validation logic
  return true; // Placeholder
};

module.exports = {
  protect,
  authorize,
  rateLimitSensitiveOps,
  require2FA,
  logSecurityEvent,
  validateSession,
};
