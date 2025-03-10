module.exports = {
  // Production-specific overrides
  debug: false,

  // Database
  db: {
    options: {
      trustServerCertificate: false,
      encrypt: true,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
      pool: {
        min: 5,
        max: 100,
        idleTimeoutMillis: 30000
      }
    }
  },

  // Logging
  logging: {
    level: 'info',
    console: {
      enabled: false
    },
    file: {
      enabled: true,
      level: 'info',
      maxFiles: '30d',
      maxSize: '100m'
    }
  },

  // Security
  security: {
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    allowedOrigins: [
      'https://bankingapp.com',
      'https://www.bankingapp.com'
    ],
    ssl: {
      enabled: true,
      requireSecure: true,
      trustProxy: true
    }
  },

  // Cache
  cache: {
    defaultTTL: 3600, // 1 hour
    longTTL: 86400 // 24 hours
  },

  // Feature Flags
  features: {
    enableDebugRoutes: false,
    enableTestAccounts: false,
    enableMockServices: false,
    maintenanceMode: false,
    requireEmailVerification: true
  },

  // Email
  email: {
    sendToTestAccount: false,
    requireVerification: true
  },

  // Documentation
  docs: {
    enabled: false
  },

  // Metrics
  metrics: {
    enabled: true,
    detailed: false,
    interval: 60000 // 1 minute
  },

  // Performance
  performance: {
    compression: true,
    minify: true,
    cache: true,
    clustering: true
  },

  // Error Handling
  errors: {
    showStack: false,
    showDetails: false,
    logToFile: true,
    logToService: true
  },

  // Session
  session: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Monitoring
  monitoring: {
    enabled: true,
    alerting: true,
    detailedErrors: false
  }
};
