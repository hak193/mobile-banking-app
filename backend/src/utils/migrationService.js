const fs = require('fs').promises;
const path = require('path');
const db = require('./db');
const logger = require('./logger');
const config = require('../config');

class MigrationService {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../db/migrations');
    this.migrationsTable = 'schema_migrations';
    this.seedsPath = path.join(__dirname, '../db/seeds');
  }

  /**
   * Initialize migrations table
   */
  async initMigrationsTable() {
    try {
      const query = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[${this.migrationsTable}]') AND type in (N'U'))
        BEGIN
          CREATE TABLE [dbo].[${this.migrationsTable}] (
            [id] INT IDENTITY(1,1) PRIMARY KEY,
            [name] NVARCHAR(255) NOT NULL,
            [batch] INT NOT NULL,
            [executed_at] DATETIME2 DEFAULT GETDATE()
          )
        END
      `;

      await db.query(query);
      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error('Error initializing migrations table:', error);
      throw error;
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations() {
    try {
      const result = await db.query(`
        SELECT name
        FROM ${this.migrationsTable}
        ORDER BY id ASC
      `);

      return result.recordset.map(r => r.name);
    } catch (error) {
      logger.error('Error getting executed migrations:', error);
      throw error;
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const executedMigrations = await this.getExecutedMigrations();

      return files
        .filter(f => f.endsWith('.sql'))
        .filter(f => !executedMigrations.includes(f))
        .sort();
    } catch (error) {
      logger.error('Error getting pending migrations:', error);
      throw error;
    }
  }

  /**
   * Run migration
   */
  async runMigration(filename, batch) {
    const transaction = await db.beginTransaction();

    try {
      const filePath = path.join(this.migrationsPath, filename);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Split content into individual statements
      const statements = content
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute each statement
      for (const statement of statements) {
        await db.query(statement, [], { transaction });
      }

      // Record migration
      await db.insert(this.migrationsTable, {
        name: filename,
        batch
      }, { transaction });

      await db.commitTransaction(transaction);
      logger.info(`Migration executed: ${filename}`);
    } catch (error) {
      await db.rollbackTransaction(transaction);
      logger.error(`Error executing migration ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    try {
      await this.initMigrationsTable();

      const pendingMigrations = await this.getPendingMigrations();
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return [];
      }

      // Get current batch number
      const result = await db.query(`
        SELECT ISNULL(MAX(batch), 0) as batch
        FROM ${this.migrationsTable}
      `);
      const batch = result.recordset[0].batch + 1;

      // Run migrations
      const executed = [];
      for (const migration of pendingMigrations) {
        await this.runMigration(migration, batch);
        executed.push(migration);
      }

      logger.info(`Executed ${executed.length} migrations`);
      return executed;
    } catch (error) {
      logger.error('Migration error:', error);
      throw error;
    }
  }

  /**
   * Rollback last batch of migrations
   */
  async rollback() {
    const transaction = await db.beginTransaction();

    try {
      // Get last batch
      const result = await db.query(`
        SELECT MAX(batch) as batch
        FROM ${this.migrationsTable}
      `);
      const batch = result.recordset[0].batch;

      if (!batch) {
        logger.info('No migrations to rollback');
        return [];
      }

      // Get migrations from last batch
      const migrations = await db.query(`
        SELECT name
        FROM ${this.migrationsTable}
        WHERE batch = @batch
        ORDER BY id DESC
      `, [batch]);

      const rolledBack = [];
      for (const migration of migrations.recordset) {
        const filename = migration.name.replace('.sql', '_rollback.sql');
        const filePath = path.join(this.migrationsPath, filename);

        // Execute rollback
        const content = await fs.readFile(filePath, 'utf8');
        const statements = content
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          await db.query(statement, [], { transaction });
        }

        // Remove migration record
        await db.delete(this.migrationsTable, {
          name: migration.name,
          batch
        }, { transaction });

        rolledBack.push(migration.name);
      }

      await db.commitTransaction(transaction);
      logger.info(`Rolled back ${rolledBack.length} migrations`);
      return rolledBack;
    } catch (error) {
      await db.rollbackTransaction(transaction);
      logger.error('Rollback error:', error);
      throw error;
    }
  }

  /**
   * Reset database
   */
  async reset() {
    try {
      // Get all migrations
      const migrations = await db.query(`
        SELECT name, batch
        FROM ${this.migrationsTable}
        ORDER BY id DESC
      `);

      // Rollback all migrations
      const rolledBack = [];
      for (const migration of migrations.recordset) {
        const filename = migration.name.replace('.sql', '_rollback.sql');
        const filePath = path.join(this.migrationsPath, filename);

        const content = await fs.readFile(filePath, 'utf8');
        await db.query(content);

        await db.delete(this.migrationsTable, {
          name: migration.name,
          batch: migration.batch
        });

        rolledBack.push(migration.name);
      }

      logger.info(`Reset complete. Rolled back ${rolledBack.length} migrations`);
      return rolledBack;
    } catch (error) {
      logger.error('Reset error:', error);
      throw error;
    }
  }

  /**
   * Run database seeds
   */
  async seed(environment = config.env) {
    try {
      const seedFile = path.join(this.seedsPath, `${environment}.sql`);
      const content = await fs.readFile(seedFile, 'utf8');

      const statements = content
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await db.query(statement);
      }

      logger.info(`Seeds executed for environment: ${environment}`);
    } catch (error) {
      logger.error('Seed error:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async status() {
    try {
      const migrations = await db.query(`
        SELECT name, batch, executed_at
        FROM ${this.migrationsTable}
        ORDER BY id ASC
      `);

      const pending = await this.getPendingMigrations();

      return {
        executed: migrations.recordset,
        pending,
        total: migrations.recordset.length + pending.length
      };
    } catch (error) {
      logger.error('Error getting migration status:', error);
      throw error;
    }
  }

  /**
   * Create new migration
   */
  async createMigration(name) {
    try {
      const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      const filename = `${timestamp}_${name}.sql`;
      const rollbackFilename = `${timestamp}_${name}_rollback.sql`;

      const migrationPath = path.join(this.migrationsPath, filename);
      const rollbackPath = path.join(this.migrationsPath, rollbackFilename);

      // Create migration file
      await fs.writeFile(migrationPath, '-- Migration SQL here\n');
      
      // Create rollback file
      await fs.writeFile(rollbackPath, '-- Rollback SQL here\n');

      logger.info('Migration files created:', {
        migration: filename,
        rollback: rollbackFilename
      });

      return {
        migration: filename,
        rollback: rollbackFilename
      };
    } catch (error) {
      logger.error('Error creating migration:', error);
      throw error;
    }
  }
}

module.exports = new MigrationService();
