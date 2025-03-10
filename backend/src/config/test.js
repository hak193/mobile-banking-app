module.exports = {
  // Test-specific overrides
  debug: true,

  // Database
  db: {
    database: process.env.TEST_DB_NAME || 'banking_test',
    options: {
      trustServerCertificate: true,
      enableArithAbort: true
    }
  },

  // Logging
  logging: {
    level: 'error',
    console: {
      enabled: false
    },
    file: {
      enabled: true,
      filename: 'test.log'
    }
  },

  // Security
  security: {
    rateLimitWindowMs: 1000, // 1 second
    rateLimitMax: 100000, // High limit for testing
    allowedOrigins: ['http://localhost:3000']
  },

  // Cache
  cache: {
    enabled: false,
    defaultTTL: 1,
    longTTL: 2
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
    testAccounts: ['test@example.com'],
    skipActualSending: true
  },

  // Documentation
  docs: {
    enabled: false
  },

  // Metrics
  metrics: {
    enabled: false
  },

  // Test Configuration
  test: {
    mockExternalServices: true,
    mockEmailService: true,
    mockSMSService: true,
    mockPaymentGateway: true,
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov']
    },
    timeout: 5000,
    cleanup: {
      enabled: true,
      afterEach: true
    }
  },

  // Mocks
  mocks: {
    database: false,
    redis: true,
    email: true,
    sms: true,
    payment: true
  },

  // Test Data
  testData: {
    users: {
      admin: {
        email: 'admin@test.com',
        password: 'Test@123'
      },
      user: {
        email: 'user@test.com',
        password: 'Test@123'
      }
    },
    accounts: {
      savings: {
        balance: 1000,
        currency: 'USD'
      },
      checking: {
        balance: 500,
        currency: 'USD'
      }
    }
  }
};
