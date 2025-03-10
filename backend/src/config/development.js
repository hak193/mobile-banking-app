module.exports = {
  // Development-specific overrides
  debug: true,
  
  // Database
  db: {
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
      debug: true
    }
  },

  // Logging
  logging: {
    level: 'debug',
    console: {
      enabled: true,
      level: 'debug',
      colorize: true
    },
    file: {
      enabled: true,
      level: 'debug'
    }
  },

  // Security
  security: {
    rateLimitWindowMs: 5 * 60 * 1000, // 5 minutes
    rateLimitMax: 1000, // Higher limit for development
    allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
  },

  // Cache
  cache: {
    defaultTTL: 60, // 1 minute
    longTTL: 300 // 5 minutes
  },

  // Feature Flags
  features: {
    enableDebugRoutes: true,
    enableTestAccounts: true,
    enableMockServices: true,
    skipEmailVerification: true
  },

  // Email
  email: {
    sendToTestAccount: true,
    testAccounts: ['dev@example.com']
  },

  // Documentation
  docs: {
    enabled: true,
    swaggerOptions: {
      explorer: true
    }
  },

  // Metrics
  metrics: {
    enabled: true,
    detailed: true,
    interval: 10000 // 10 seconds
  },

  // Development Tools
  devTools: {
    enableConsoleLogger: true,
    enableDebugger: true,
    enableInspector: true
  },

  // Test Data
  testData: {
    enabled: true,
    seedDatabase: true,
    mockServices: true
  }
};
