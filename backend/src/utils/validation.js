const yup = require('yup');
const { ValidationError } = require('../middleware/errorMiddleware');

// User validation schemas
const userSchemas = {
  registration: yup.object({
    fullName: yup.string()
      .required('Full name is required')
      .min(3, 'Full name must be at least 3 characters')
      .max(100, 'Full name must not exceed 100 characters'),
    email: yup.string()
      .required('Email is required')
      .email('Invalid email format')
      .max(100, 'Email must not exceed 100 characters'),
    password: yup.string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, number, and special character'
      ),
    phone: yup.string()
      .matches(/^\+?[\d\s-]{10,}$/, 'Invalid phone number format')
  }),

  login: yup.object({
    email: yup.string()
      .required('Email is required')
      .email('Invalid email format'),
    password: yup.string()
      .required('Password is required')
  }),

  updateProfile: yup.object({
    fullName: yup.string()
      .min(3, 'Full name must be at least 3 characters')
      .max(100, 'Full name must not exceed 100 characters'),
    phone: yup.string()
      .matches(/^\+?[\d\s-]{10,}$/, 'Invalid phone number format')
  })
};

// Transaction validation schemas
const transactionSchemas = {
  transfer: yup.object({
    fromAccountId: yup.number()
      .required('Source account is required'),
    toAccountId: yup.number()
      .required('Destination account is required')
      .notOneOf([yup.ref('fromAccountId')], 'Cannot transfer to the same account'),
    amount: yup.number()
      .required('Amount is required')
      .positive('Amount must be positive')
      .max(1000000, 'Amount exceeds maximum limit'),
    description: yup.string()
      .max(255, 'Description must not exceed 255 characters')
  }),

  billPayment: yup.object({
    accountId: yup.number()
      .required('Account is required'),
    billerId: yup.number()
      .required('Biller is required'),
    amount: yup.number()
      .required('Amount is required')
      .positive('Amount must be positive'),
    reference: yup.string()
      .required('Reference number is required')
      .max(100, 'Reference must not exceed 100 characters'),
    scheduledDate: yup.date()
      .min(new Date(), 'Scheduled date must be in the future')
  })
};

// Account validation schemas
const accountSchemas = {
  createAccount: yup.object({
    accountType: yup.string()
      .required('Account type is required')
      .oneOf(['savings', 'checking'], 'Invalid account type'),
    currency: yup.string()
      .default('USD')
      .oneOf(['USD', 'EUR', 'GBP'], 'Invalid currency')
  }),

  updateAccount: yup.object({
    status: yup.string()
      .oneOf(['active', 'inactive', 'frozen'], 'Invalid account status')
  })
};

// Notification validation schemas
const notificationSchemas = {
  preferences: yup.object({
    email: yup.boolean(),
    push: yup.boolean(),
    sms: yup.boolean(),
    types: yup.object({
      transaction: yup.boolean(),
      security: yup.boolean(),
      marketing: yup.boolean()
    })
  })
};

// Validation middleware factory
const validate = (schema) => async (req, res, next) => {
  try {
    const validatedData = await schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    req.validatedData = validatedData;
    next();
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.map(err => ({
        field: err.path,
        message: err.message
      }));
      next(new ValidationError('Validation failed', errors));
    } else {
      next(error);
    }
  }
};

// Custom validation helpers
const validators = {
  isValidAccountNumber: (accountNumber) => {
    return /^\d{10}$/.test(accountNumber);
  },

  isValidAmount: (amount) => {
    return typeof amount === 'number' && amount > 0 && amount <= 1000000;
  },

  isValidPhoneNumber: (phone) => {
    return /^\+?[\d\s-]{10,}$/.test(phone);
  },

  isValidEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isStrongPassword: (password) => {
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  },

  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  },

  sanitizeObject: (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = typeof value === 'string' ? 
        validators.sanitizeInput(value) : value;
    }
    return sanitized;
  }
};

module.exports = {
  userSchemas,
  transactionSchemas,
  accountSchemas,
  notificationSchemas,
  validate,
  validators
};
