const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const config = require('../config');
const logger = require('../utils/logger');
const { 
  ValidationError, 
  AuthenticationError, 
  DuplicateResourceError 
} = require('../middleware/errorMiddleware');

class UserService {
  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await db.findOne('Users', { email: userData.email });
      if (existingUser) {
        throw new DuplicateResourceError('User with this email already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await db.insert('Users', {
        ...userData,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create initial account for user
      await db.insert('Accounts', {
        userId: user.id,
        accountType: 'savings',
        accountNumber: this.generateAccountNumber(),
        balance: 0,
        status: 'active',
        createdAt: new Date()
      });

      logger.info('New user created', { userId: user.id });
      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async authenticateUser(email, password) {
    try {
      // Get user
      const user = await db.findOne('Users', { email });
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check account status
      if (user.status !== 'active') {
        throw new AuthenticationError('Account is not active');
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Update last login
      await db.update('Users', 
        { id: user.id },
        { lastLoginAt: new Date() }
      );

      logger.info('User authenticated', { userId: user.id });
      return {
        user: this.sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await db.findOne('Users', { id: userId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId, updateData) {
    try {
      // Prevent updating sensitive fields
      const allowedUpdates = ['fullName', 'phone', 'address'];
      const sanitizedData = Object.keys(updateData)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});

      const updatedUser = await db.update('Users',
        { id: userId },
        {
          ...sanitizedData,
          updatedAt: new Date()
        }
      );

      logger.info('User updated', { userId });
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await db.findOne('Users', { id: userId });

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await db.update('Users',
        { id: userId },
        {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        }
      );

      logger.info('Password changed', { userId });
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Enable/Disable 2FA
   */
  async toggle2FA(userId, enable) {
    try {
      const user = await db.update('Users',
        { id: userId },
        {
          twoFactorEnabled: enable,
          updatedAt: new Date()
        }
      );

      logger.info('2FA status updated', { userId, enabled: enable });
      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Error toggling 2FA:', error);
      throw error;
    }
  }

  // Helper methods

  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  generateAccountNumber() {
    // Generate a random 10-digit account number
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = new UserService();
