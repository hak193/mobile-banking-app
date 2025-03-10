const logger = require('./logger');
const config = require('../config');

class ResponseService {
  /**
   * Send success response
   */
  success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      data
    };

    // Add pagination metadata if available
    if (data && data.pagination) {
      response.pagination = data.pagination;
      response.data = data.results;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  error(res, error, statusCode = 500) {
    const response = {
      success: false,
      message: error.message || 'Internal Server Error',
      code: error.code || 'INTERNAL_ERROR'
    };

    // Add validation errors if available
    if (error.validationErrors) {
      response.errors = error.validationErrors;
    }

    // Add error details in development
    if (config.env === 'development') {
      response.stack = error.stack;
      response.details = error.details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  validationError(res, errors) {
    return this.error(res, {
      message: 'Validation Error',
      code: 'VALIDATION_ERROR',
      validationErrors: errors
    }, 400);
  }

  /**
   * Send unauthorized error response
   */
  unauthorized(res, message = 'Unauthorized') {
    return this.error(res, {
      message,
      code: 'UNAUTHORIZED'
    }, 401);
  }

  /**
   * Send forbidden error response
   */
  forbidden(res, message = 'Forbidden') {
    return this.error(res, {
      message,
      code: 'FORBIDDEN'
    }, 403);
  }

  /**
   * Send not found error response
   */
  notFound(res, message = 'Not Found') {
    return this.error(res, {
      message,
      code: 'NOT_FOUND'
    }, 404);
  }

  /**
   * Send conflict error response
   */
  conflict(res, message = 'Conflict') {
    return this.error(res, {
      message,
      code: 'CONFLICT'
    }, 409);
  }

  /**
   * Send too many requests error response
   */
  tooManyRequests(res, message = 'Too Many Requests') {
    return this.error(res, {
      message,
      code: 'TOO_MANY_REQUESTS'
    }, 429);
  }

  /**
   * Send paginated response
   */
  paginated(res, data, page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    return this.success(res, {
      pagination,
      results: data
    });
  }

  /**
   * Send created response
   */
  created(res, data = null, message = 'Created Successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response
   */
  noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send accepted response
   */
  accepted(res, message = 'Request Accepted') {
    return this.success(res, null, message, 202);
  }

  /**
   * Send file response
   */
  file(res, file, filename) {
    return res
      .set('Content-Type', file.mimeType)
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .send(file.buffer);
  }

  /**
   * Send stream response
   */
  stream(res, stream, filename, mimeType) {
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    stream.pipe(res);
  }

  /**
   * Send JSON stream response
   */
  jsonStream(res, data) {
    res.set({
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    if (Array.isArray(data)) {
      res.write('[\n');
      data.forEach((item, index) => {
        res.write(JSON.stringify(item));
        if (index < data.length - 1) {
          res.write(',\n');
        }
      });
      res.write('\n]');
    } else {
      res.write(JSON.stringify(data));
    }

    res.end();
  }

  /**
   * Send partial content response
   */
  partialContent(res, data, range, totalSize) {
    const start = range.start;
    const end = range.end;
    
    res.set({
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1
    });

    return res.status(206).send(data);
  }

  /**
   * Send redirect response
   */
  redirect(res, url, statusCode = 302) {
    return res.redirect(statusCode, url);
  }

  /**
   * Send SSE (Server-Sent Events) response
   */
  sse(res) {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection established message
    res.write('data: {"connection": "established"}\n\n');

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(keepAlive);
      res.end();
    });

    return {
      send(data) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      },
      close() {
        clearInterval(keepAlive);
        res.end();
      }
    };
  }

  /**
   * Create response middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      res.success = (data, message, statusCode) => 
        this.success(res, data, message, statusCode);
      
      res.error = (error, statusCode) => 
        this.error(res, error, statusCode);
      
      res.validationError = (errors) => 
        this.validationError(res, errors);
      
      res.unauthorized = (message) => 
        this.unauthorized(res, message);
      
      res.forbidden = (message) => 
        this.forbidden(res, message);
      
      res.notFound = (message) => 
        this.notFound(res, message);
      
      res.paginated = (data, page, limit, total) => 
        this.paginated(res, data, page, limit, total);

      next();
    };
  }
}

module.exports = new ResponseService();
