# Mobile Banking Backend Services

A robust, secure, and scalable backend infrastructure for the mobile banking application.

## Architecture Overview

The backend is built with a service-oriented architecture, providing various utility services for handling different aspects of the banking application:

### Core Services

#### Security & Authentication
- `securityService`: Handles encryption, token management, and security utilities
- `rateLimitService`: Prevents abuse through request rate limiting
- `auditService`: Tracks and logs all system activities
- `errorService`: Centralizes error handling and reporting

#### Data Management
- `db`: Database connection and query utilities
- `migrationService`: Manages database schema migrations
- `backupService`: Handles database backups and restoration
- `cacheService`: Provides caching mechanisms for performance
- `storageService`: Manages file storage (local and cloud)

#### Communication
- `emailService`: Handles email communications
- `smsService`: Manages SMS notifications
- `pushNotificationService`: Handles mobile push notifications
- `notificationService`: Orchestrates various notification channels

#### Business Logic
- `currencyService`: Handles currency conversions and calculations
- `documentService`: Generates documents and statements
- `validationService`: Provides input validation utilities

#### Performance & Monitoring
- `performanceService`: Monitors system performance
- `metricsService`: Collects and reports system metrics
- `logger`: Centralized logging service

#### Internationalization
- `i18nService`: Handles multi-language support
- Translations available in:
  - English (en)
  - Spanish (es)

#### Job Processing
- `jobService`: Manages background jobs and scheduled tasks

#### API
- `responseService`: Standardizes API responses
- `swaggerService`: Provides API documentation

## Setup & Configuration

### Prerequisites
- Node.js (v14+)
- PostgreSQL
- Redis
- Azure Storage Account (for cloud storage)
- SMTP Server
- Twilio Account (for SMS)
- Firebase Account (for push notifications)

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Application
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DB_SERVER=localhost
DB_NAME=banking_db
DB_USER=user
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
EMAIL_FROM=noreply@bankingapp.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-number

# Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER_NAME=your-container

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

## API Documentation

API documentation is available at `/api-docs` when the server is running. It provides:
- Endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests

## Internationalization

The application supports multiple languages through translation files located in `src/locales/`:
- Common messages
- Error messages
- Email templates
- Validation messages

To add a new language:
1. Create a new directory in `src/locales/` with the language code
2. Copy and translate the JSON files from an existing language

## Security Features

- JWT-based authentication
- Rate limiting
- Request validation
- SQL injection prevention
- XSS protection
- CORS configuration
- Audit logging
- Error tracking
- Security headers

## Performance Features

- Response caching
- Query optimization
- Connection pooling
- Request sampling
- Performance monitoring
- Resource usage tracking
- Slow query logging

## Monitoring & Logging

- Performance metrics
- Error tracking
- Audit logs
- Request logging
- Database query logging
- Cache hit/miss rates
- Job execution status

## Background Jobs

Scheduled tasks include:
- Database backups
- Statement generation
- Notification processing
- Metric aggregation
- Cache cleanup
- Log rotation

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Development Guidelines

### Code Style
- Follow ESLint configuration
- Use async/await for asynchronous operations
- Implement proper error handling
- Add JSDoc comments for functions
- Write unit tests for new features

### Git Workflow
1. Create feature branch from development
2. Make changes and commit
3. Write/update tests
4. Create pull request
5. Code review
6. Merge to development

### Deployment
1. Merge development to staging
2. Run integration tests
3. Deploy to staging environment
4. Run smoke tests
5. Merge to main
6. Deploy to production

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
