const logger = require('../utils/logger');

// Handle 404 errors
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);

  // Determine status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Prepare error response
  const errorResponse = {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  };

  // Add validation errors if present
  if (err.name === 'ValidationError') {
    errorResponse.errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
    }));
  }

  // Add specific error codes for client handling
  if (err.code) {
    errorResponse.code = err.code;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Custom error classes
class APIError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'APIError';
  }
}

class ValidationError extends Error {
  constructor(errors) {
    super('Validation Error');
    this.statusCode = 400;
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.statusCode = 401;
    this.code = 'AUTH_FAILED';
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Not authorized to access this resource') {
    super(message);
    this.statusCode = 403;
    this.code = 'ACCESS_DENIED';
    this.name = 'AuthorizationError';
  }
}

class ResourceNotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
    this.name = 'ResourceNotFoundError';
  }
}

class DuplicateResourceError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} already exists`);
    this.statusCode = 409;
    this.code = 'DUPLICATE';
    this.name = 'DuplicateResourceError';
  }
}

module.exports = {
  notFound,
  errorHandler,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError,
  DuplicateResourceError,
};
