const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const config = require('../config');
const logger = require('./logger');
const storageService = require('./storageService');

class BackupService {
  constructor() {
    this.backupPath = path.join(__dirname, '../../backups');
    this.retentionDays = config.backup.retentionDays || 30;
    this.compressionEnabled = config.backup.compression || true;
    this.cloudBackupEnabled = config.backup.cloudEnabled || false;
  }

  /**
   * Create backup filename
   */
  createBackupFilename(type = 'full') {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return `backup_${type}_${timestamp}.bak`;
  }

  /**
   * Create full backup
   */
  async createFullBackup() {
    try {
      const filename = this.createBackupFilename('full');
      const backupFile = path.join(this.backupPath, filename);

      // Ensure backup directory exists
      await fs.mkdir(this.backupPath, { recursive: true });

      // Create backup
      const query = `
        BACKUP DATABASE [${config.db.database}]
        TO DISK = '${backupFile}'
        WITH FORMAT, COMPRESSION,
        NAME = '${config.db.database}-Full Database Backup',
        DESCRIPTION = 'Full backup of ${config.db.database}'
      `;

      await this.executeBackupCommand(query);

      // Upload to cloud if enabled
      if (this.cloudBackupEnabled) {
        await this.uploadToCloud(backupFile, filename);
      }

      logger.info('Full backup created:', { filename });
      return { filename, path: backupFile };
    } catch (error) {
      logger.error('Error creating full backup:', error);
      throw error;
    }
  }

  /**
   * Create differential backup
   */
  async createDifferentialBackup() {
    try {
      const filename = this.createBackupFilename('diff');
      const backupFile = path.join(this.backupPath, filename);

      const query = `
        BACKUP DATABASE [${config.db.database}]
        TO DISK = '${backupFile}'
        WITH DIFFERENTIAL, COMPRESSION,
        NAME = '${config.db.database}-Differential Database Backup',
        DESCRIPTION = 'Differential backup of ${config.db.database}'
      `;

      await this.executeBackupCommand(query);

      if (this.cloudBackupEnabled) {
        await this.uploadToCloud(backupFile, filename);
      }

      logger.info('Differential backup created:', { filename });
      return { filename, path: backupFile };
    } catch (error) {
      logger.error('Error creating differential backup:', error);
      throw error;
    }
  }

  /**
   * Create transaction log backup
   */
  async createLogBackup() {
    try {
      const filename = this.createBackupFilename('log');
      const backupFile = path.join(this.backupPath, filename);

      const query = `
        BACKUP LOG [${config.db.database}]
        TO DISK = '${backupFile}'
        WITH COMPRESSION,
        NAME = '${config.db.database}-Log Backup',
        DESCRIPTION = 'Transaction log backup of ${config.db.database}'
      `;

      await this.executeBackupCommand(query);

      if (this.cloudBackupEnabled) {
        await this.uploadToCloud(backupFile, filename);
      }

      logger.info('Transaction log backup created:', { filename });
      return { filename, path: backupFile };
    } catch (error) {
      logger.error('Error creating log backup:', error);
      throw error;
    }
  }

  /**
   * Execute backup command
   */
  async executeBackupCommand(query) {
    try {
      const command = `sqlcmd -S ${config.db.server} -U ${config.db.user} -P ${config.db.password} -Q "${query}"`;
      await execAsync(command);
    } catch (error) {
      logger.error('Error executing backup command:', error);
      throw error;
    }
  }

  /**
   * Upload backup to cloud storage
   */
  async uploadToCloud(filePath, filename) {
    try {
      const fileContent = await fs.readFile(filePath);
      await storageService.uploadToAzure({
        buffer: fileContent,
        originalname: filename
      }, 'backups');

      logger.info('Backup uploaded to cloud:', { filename });
    } catch (error) {
      logger.error('Error uploading backup to cloud:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(backupFile) {
    try {
      const query = `
        RESTORE DATABASE [${config.db.database}]
        FROM DISK = '${backupFile}'
        WITH REPLACE, RECOVERY
      `;

      await this.executeBackupCommand(query);
      logger.info('Database restored from backup:', { backupFile });
    } catch (error) {
      logger.error('Error restoring database:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupPath);
      const backups = await Promise.all(
        files
          .filter(f => f.endsWith('.bak'))
          .map(async f => {
            const filePath = path.join(this.backupPath, f);
            const stats = await fs.stat(filePath);
            return {
              filename: f,
              path: filePath,
              size: stats.size,
              created: stats.birthtime
            };
          })
      );

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Error listing backups:', error);
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

      const oldBackups = backups.filter(
        b => now - b.created.getTime() > retentionMs
      );

      for (const backup of oldBackups) {
        await fs.unlink(backup.path);
        
        if (this.cloudBackupEnabled) {
          await storageService.deleteFromAzure(`backups/${backup.filename}`);
        }

        logger.info('Old backup deleted:', { filename: backup.filename });
      }

      return oldBackups.length;
    } catch (error) {
      logger.error('Error cleaning up old backups:', error);
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFile) {
    try {
      const query = `
        RESTORE VERIFYONLY
        FROM DISK = '${backupFile}'
      `;

      await this.executeBackupCommand(query);
      logger.info('Backup verified:', { backupFile });
      return true;
    } catch (error) {
      logger.error('Backup verification failed:', error);
      return false;
    }
  }

  /**
   * Get backup details
   */
  async getBackupDetails(backupFile) {
    try {
      const query = `
        RESTORE HEADERONLY
        FROM DISK = '${backupFile}'
      `;

      const { stdout } = await execAsync(`sqlcmd -S ${config.db.server} -U ${config.db.user} -P ${config.db.password} -Q "${query}" -h-1`);
      
      const lines = stdout.split('\n');
      const details = {};
      
      for (const line of lines) {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          details[key] = value;
        }
      }

      return details;
    } catch (error) {
      logger.error('Error getting backup details:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleBackups() {
    // This would typically be handled by a job scheduler like cron
    // Here we're just defining the backup strategy
    return {
      full: {
        frequency: 'weekly',
        day: 'sunday',
        time: '00:00'
      },
      differential: {
        frequency: 'daily',
        time: '00:00'
      },
      log: {
        frequency: 'hourly',
        minute: '00'
      }
    };
  }
}

module.exports = new BackupService();
