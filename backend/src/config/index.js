require('dotenv').config();
const path = require('path');

// Environment validation
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'DB_SERVER',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  db: {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: true,
      trustServerCertificate: process.env.NODE_ENV !== 'production',
      connectionTimeout: 30000,
      requestTimeout: 30000
    }
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_PREFIX || 'banking:'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  },

  // Email Configuration
  email: {
    from: process.env.EMAIL_FROM || 'noreply@bankingapp.com',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  // Security Configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(','),
    encryptionKey: process.env.ENCRYPTION_KEY,
    enable2FA: process.env.ENABLE_2FA === 'true',
    enableBiometric: process.env.ENABLE_BIOMETRIC === 'true'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileLogging: process.env.FILE_LOGGING_ENABLED === 'true',
    filename: process.env.LOG_FILENAME || 'app.log',
    maxSize: '10m',
    maxFiles: '7d'
  },

  // File Storage
  storage: {
    documentsPath: path.join(__dirname, '../../documents'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['pdf', 'jpg', 'png', 'doc', 'docx'],
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME
    }
  },

  // Transaction Limits
  transactionLimits: {
    minAmount: 0.01,
    maxAmount: parseFloat(process.env.MAX_TRANSACTION_AMOUNT) || 10000,
    dailyLimit: parseFloat(process.env.DAILY_TRANSACTION_LIMIT) || 50000,
    monthlyLimit: parseFloat(process.env.MONTHLY_TRANSACTION_LIMIT) || 100000
  },

  // Feature Flags
  features: {
    enablePushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
    enableBillPayments: process.env.ENABLE_BILL_PAYMENTS !== 'false',
    enableStatements: process.env.ENABLE_STATEMENTS !== 'false',
    enableInternationalTransfers: process.env.ENABLE_INTERNATIONAL_TRANSFERS === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
  },

  // Third-party Services
  services: {
    sentry: {
      dsn: process.env.SENTRY_DSN
    },
    newRelic: {
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY
    }
  },

  // Cache Configuration
  cache: {
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 3600,
    longTTL: parseInt(process.env.CACHE_LONG_TTL, 10) || 86400
  },

  // Job Queue Configuration
  queue: {
    defaultAttempts: 3,
    defaultBackoff: {
      type: 'exponential',
      delay: 1000
    },
    defaultTimeout: 5000,
    defaultRemoveOnComplete: 100,
    defaultRemoveOnFail: 100
  },

  // API Documentation
  docs: {
    enabled: process.env.ENABLE_API_DOCS !== 'false',
    path: '/api-docs'
  },

  // Support Contact Information
  support: {
    email: process.env.SUPPORT_EMAIL || 'support@bankingapp.com',
    phone: process.env.SUPPORT_PHONE || '1-800-BANKING',
    hours: process.env.SUPPORT_HOURS || '24/7'
  }
};

// Environment-specific overrides
const envConfig = require(`./${config.env}`);
Object.assign(config, envConfig);

// Freeze configuration to prevent modifications
Object.freeze(config);

module.exports = config;
