const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('./logger');

class SecurityService {
  /**
   * Generate random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  async hashData(data, saltRounds = config.security.bcryptSaltRounds) {
    return bcrypt.hash(data, saltRounds);
  }

  /**
   * Compare hashed data
   */
  async compareHash(data, hash) {
    return bcrypt.compare(data, hash);
  }

  /**
   * Generate 2FA secret
   */
  generate2FASecret(userId, email) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Mobile Banking (${email})`
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for 2FA
   */
  async generateQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token
   */
  verify2FAToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 30 seconds clock drift
    });
  }

  /**
   * Generate temporary 2FA code
   */
  generateTempCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data, key = config.security.encryptionKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData, key = config.security.encryptionKey) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const validations = {
      length: password.length >= minLength,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      specialChar: hasSpecialChar
    };

    const isValid = Object.values(validations).every(v => v);

    return {
      isValid,
      validations
    };
  }

  /**
   * Check for suspicious activity
   */
  checkSuspiciousActivity(activity) {
    const suspiciousPatterns = {
      unusualLocation: this.isUnusualLocation(activity.location, activity.userId),
      largeTransaction: this.isLargeTransaction(activity.amount),
      rapidTransactions: this.isRapidTransactions(activity.userId),
      newDevice: this.isNewDevice(activity.deviceId, activity.userId),
      multipleFailedAttempts: this.hasMultipleFailedAttempts(activity.userId)
    };

    const riskScore = this.calculateRiskScore(suspiciousPatterns);

    return {
      isSupicious: riskScore > 70,
      riskScore,
      patterns: suspiciousPatterns
    };
  }

  /**
   * Calculate risk score based on suspicious patterns
   */
  calculateRiskScore(patterns) {
    const weights = {
      unusualLocation: 30,
      largeTransaction: 25,
      rapidTransactions: 20,
      newDevice: 15,
      multipleFailedAttempts: 10
    };

    return Object.entries(patterns).reduce((score, [key, value]) => {
      return score + (value ? weights[key] : 0);
    }, 0);
  }

  /**
   * Check if location is unusual for user
   */
  isUnusualLocation(location, userId) {
    // Implementation would involve checking user's usual locations
    // and comparing with current location
    return false; // Placeholder
  }

  /**
   * Check if transaction amount is unusually large
   */
  isLargeTransaction(amount) {
    const threshold = 10000; // Example threshold
    return amount > threshold;
  }

  /**
   * Check for rapid successive transactions
   */
  isRapidTransactions(userId) {
    // Implementation would involve checking recent transaction history
    // and identifying rapid successive transactions
    return false; // Placeholder
  }

  /**
   * Check if device is new for user
   */
  isNewDevice(deviceId, userId) {
    // Implementation would involve checking user's known devices
    return false; // Placeholder
  }

  /**
   * Check for multiple failed login attempts
   */
  hasMultipleFailedAttempts(userId) {
    // Implementation would involve checking recent failed login attempts
    return false; // Placeholder
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sanitize sensitive data for logging
   */
  sanitizeForLogging(data) {
    const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}

module.exports = new SecurityService();
