const db = require('./db');
const logger = require('./logger');
const securityService = require('./securityService');
const metricsService = require('./metricsService');

class AuditService {
  /**
   * Log audit event
   */
  async logEvent(eventType, data, userId = null) {
    try {
      // Sanitize sensitive data
      const sanitizedData = securityService.sanitizeForLogging(data);

      const auditEntry = {
        eventType,
        userId,
        timestamp: new Date(),
        data: JSON.stringify(sanitizedData),
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        status: data.status || 'success'
      };

      // Store audit log in database
      await db.insert('AuditLogs', auditEntry);

      // Record metric
      await metricsService.incrementCounter('audit.events', 1, {
        type: eventType,
        status: auditEntry.status
      });

      logger.info('Audit event logged:', {
        eventType,
        userId,
        status: auditEntry.status
      });

      return true;
    } catch (error) {
      logger.error('Error logging audit event:', error);
      throw error;
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(action, userId, success, details = {}) {
    await this.logEvent('authentication', {
      action,
      success,
      ...details
    }, userId);
  }

  /**
   * Log transaction event
   */
  async logTransaction(transactionId, userId, details = {}) {
    await this.logEvent('transaction', {
      transactionId,
      ...details
    }, userId);
  }

  /**
   * Log security event
   */
  async logSecurity(action, userId, details = {}) {
    await this.logEvent('security', {
      action,
      ...details
    }, userId);
  }

  /**
   * Log data access event
   */
  async logDataAccess(resource, action, userId, details = {}) {
    await this.logEvent('data_access', {
      resource,
      action,
      ...details
    }, userId);
  }

  /**
   * Log system event
   */
  async logSystem(action, details = {}) {
    await this.logEvent('system', {
      action,
      ...details
    });
  }

  /**
   * Log configuration change
   */
  async logConfigChange(component, change, userId, details = {}) {
    await this.logEvent('config_change', {
      component,
      change,
      ...details
    }, userId);
  }

  /**
   * Log user profile change
   */
  async logProfileChange(userId, changes, details = {}) {
    await this.logEvent('profile_change', {
      changes,
      ...details
    }, userId);
  }

  /**
   * Log permission change
   */
  async logPermissionChange(targetUserId, change, adminUserId, details = {}) {
    await this.logEvent('permission_change', {
      targetUserId,
      change,
      ...details
    }, adminUserId);
  }

  /**
   * Log API request
   */
  async logAPIRequest(method, path, statusCode, userId, details = {}) {
    await this.logEvent('api_request', {
      method,
      path,
      statusCode,
      ...details
    }, userId);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters = {}, pagination = {}) {
    try {
      const {
        userId,
        eventType,
        startDate,
        endDate,
        status
      } = filters;

      const {
        limit = 50,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'DESC'
      } = pagination;

      let conditions = {};

      if (userId) conditions.userId = userId;
      if (eventType) conditions.eventType = eventType;
      if (status) conditions.status = status;
      if (startDate) conditions.timestamp = { $gte: new Date(startDate) };
      if (endDate) {
        conditions.timestamp = {
          ...conditions.timestamp,
          $lte: new Date(endDate)
        };
      }

      const logs = await db.findMany('AuditLogs', conditions, '*', {
        limit,
        offset,
        orderBy: `${sortBy} ${sortOrder}`
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit summary
   */
  async getAuditSummary(startDate, endDate) {
    try {
      const summary = await db.query(`
        SELECT 
          eventType,
          status,
          COUNT(*) as count
        FROM AuditLogs
        WHERE timestamp BETWEEN @startDate AND @endDate
        GROUP BY eventType, status
      `, [startDate, endDate]);

      return summary.recordset;
    } catch (error) {
      logger.error('Error getting audit summary:', error);
      throw error;
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserTimeline(userId, limit = 50) {
    try {
      const logs = await db.findMany('AuditLogs',
        { userId },
        '*',
        {
          limit,
          orderBy: 'timestamp DESC'
        }
      );

      return logs.map(log => ({
        ...log,
        data: JSON.parse(log.data)
      }));
    } catch (error) {
      logger.error('Error getting user timeline:', error);
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(searchTerm, filters = {}) {
    try {
      // Note: Implementation would depend on your database and search capabilities
      const logs = await db.query(`
        SELECT *
        FROM AuditLogs
        WHERE 
          data LIKE @searchTerm
          OR eventType LIKE @searchTerm
          ${filters.userId ? 'AND userId = @userId' : ''}
          ${filters.startDate ? 'AND timestamp >= @startDate' : ''}
          ${filters.endDate ? 'AND timestamp <= @endDate' : ''}
        ORDER BY timestamp DESC
        LIMIT 100
      `, {
        searchTerm: `%${searchTerm}%`,
        ...filters
      });

      return logs.recordset;
    } catch (error) {
      logger.error('Error searching audit logs:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(format, filters = {}) {
    try {
      const logs = await this.getAuditLogs(filters);

      switch (format.toLowerCase()) {
        case 'csv':
          return this.exportToCSV(logs);
        case 'json':
          return this.exportToJSON(logs);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  /**
   * Export to CSV
   */
  exportToCSV(logs) {
    // Implementation for CSV export
    return 'timestamp,eventType,userId,status,details\n' +
      logs.map(log => {
        const data = JSON.parse(log.data);
        return `${log.timestamp},${log.eventType},${log.userId},${log.status},${JSON.stringify(data)}`;
      }).join('\n');
  }

  /**
   * Export to JSON
   */
  exportToJSON(logs) {
    return JSON.stringify(logs.map(log => ({
      ...log,
      data: JSON.parse(log.data)
    })), null, 2);
  }
}

module.exports = new AuditService();
