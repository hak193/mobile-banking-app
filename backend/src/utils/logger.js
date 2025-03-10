const winston = require('winston');
const path = require('path');
const config = require('../config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}`
      )
    )
  })
];

// Add file transport if enabled
if (config.logging.file.enabled) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs', config.logging.file.filename),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs', 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs', 'rejections.log')
    })
  ]
});

// Create stream for Morgan middleware
logger.stream = {
  write: message => logger.info(message.trim())
};

// Add custom logging methods
logger.logAPIRequest = (req, res, duration) => {
  const { method, originalUrl, ip, user } = req;
  logger.info('API Request', {
    method,
    url: originalUrl,
    ip,
    userId: user?.id,
    duration,
    statusCode: res.statusCode
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };

  if (req) {
    errorLog.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      ip: req.ip,
      userId: req.user?.id
    };
  }

  logger.error('Error occurred', errorLog);
};

logger.logTransaction = (transaction) => {
  logger.info('Transaction processed', {
    transactionId: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    userId: transaction.userId,
    timestamp: transaction.timestamp
  });
};

logger.logSecurityEvent = (event) => {
  logger.warn('Security event detected', {
    type: event.type,
    userId: event.userId,
    ip: event.ip,
    details: event.details,
    timestamp: event.timestamp
  });
};

logger.logMetric = (metric) => {
  logger.info('Metric recorded', {
    name: metric.name,
    value: metric.value,
    tags: metric.tags,
    timestamp: new Date().toISOString()
  });
};

// Development logging helper
if (config.nodeEnv !== 'production') {
  logger.debug = (message, meta = {}) => {
    console.log('\n🔍 Debug:', message);
    if (Object.keys(meta).length > 0) {
      console.log('Meta:', JSON.stringify(meta, null, 2), '\n');
    }
  };
}

module.exports = logger;
