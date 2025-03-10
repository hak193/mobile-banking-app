const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass
      }
    });

    // Register handlebars helpers
    handlebars.registerHelper('formatDate', function(date) {
      return new Date(date).toLocaleDateString();
    });

    handlebars.registerHelper('formatCurrency', function(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    });
  }

  /**
   * Load and compile email template
   */
  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
      const template = fs.readFileSync(templatePath, 'utf-8');
      return handlebars.compile(template);
    } catch (error) {
      logger.error('Error loading email template:', error);
      throw error;
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, template, data) {
    try {
      const compiledTemplate = await this.loadTemplate(template);
      const html = compiledTemplate(data);

      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: info.messageId });
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail(
      user.email,
      'Welcome to Mobile Banking',
      'welcome',
      {
        name: user.fullName,
        loginUrl: `${config.clientUrl}/login`
      }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    return this.sendEmail(
      user.email,
      'Reset Your Password',
      'password-reset',
      {
        name: user.fullName,
        resetUrl: `${config.clientUrl}/reset-password?token=${resetToken}`,
        expiryTime: '1 hour'
      }
    );
  }

  /**
   * Send transaction confirmation
   */
  async sendTransactionConfirmation(user, transaction) {
    return this.sendEmail(
      user.email,
      'Transaction Confirmation',
      'transaction',
      {
        name: user.fullName,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.createdAt,
        reference: transaction.reference,
        status: transaction.status
      }
    );
  }

  /**
   * Send bill payment confirmation
   */
  async sendBillPaymentConfirmation(user, payment) {
    return this.sendEmail(
      user.email,
      'Bill Payment Confirmation',
      'bill-payment',
      {
        name: user.fullName,
        billerName: payment.billerName,
        amount: payment.amount,
        date: payment.createdAt,
        reference: payment.reference,
        status: payment.status
      }
    );
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(user, alert) {
    return this.sendEmail(
      user.email,
      'Security Alert',
      'security-alert',
      {
        name: user.fullName,
        alertType: alert.type,
        details: alert.details,
        date: alert.timestamp,
        location: alert.location,
        device: alert.device
      }
    );
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(user, account) {
    return this.sendEmail(
      user.email,
      'Low Balance Alert',
      'low-balance',
      {
        name: user.fullName,
        accountNumber: account.accountNumber,
        balance: account.balance,
        threshold: account.lowBalanceThreshold
      }
    );
  }

  /**
   * Send statement notification
   */
  async sendStatementNotification(user, statement) {
    return this.sendEmail(
      user.email,
      'Your Account Statement is Ready',
      'statement',
      {
        name: user.fullName,
        accountNumber: statement.accountNumber,
        startDate: statement.startDate,
        endDate: statement.endDate,
        downloadUrl: statement.downloadUrl
      }
    );
  }

  /**
   * Send suspicious activity alert
   */
  async sendSuspiciousActivityAlert(user, activity) {
    return this.sendEmail(
      user.email,
      'Suspicious Activity Detected',
      'suspicious-activity',
      {
        name: user.fullName,
        activityType: activity.type,
        details: activity.details,
        date: activity.timestamp,
        location: activity.location,
        device: activity.device,
        actionRequired: activity.actionRequired
      }
    );
  }

  /**
   * Send 2FA code
   */
  async send2FACode(user, code) {
    return this.sendEmail(
      user.email,
      'Your Authentication Code',
      '2fa-code',
      {
        name: user.fullName,
        code,
        expiryTime: '5 minutes'
      }
    );
  }
}

module.exports = new EmailService();
