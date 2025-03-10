const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const config = require('../config');
const logger = require('../utils/logger');

class DatabaseInitializer {
  constructor() {
    this.config = config.db;
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  async initialize() {
    try {
      logger.info('Starting database initialization...');
      await this.connectToDatabase();
      await this.executeSchemaFile();
      logger.info('Database initialization completed successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    } finally {
      if (this.pool) {
        await this.pool.close();
      }
    }
  }

  async connectToDatabase() {
    try {
      this.pool = await sql.connect(this.config);
      logger.info('Connected to database successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async executeSchemaFile() {
    try {
      const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
      const statements = this.splitStatements(schemaContent);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await this.pool.request().query(statement);
          } catch (error) {
            logger.error(`Error executing statement: ${error.message}`);
            logger.error('Statement:', statement);
          }
        }
      }
      logger.info('Schema execution completed');
    } catch (error) {
      logger.error('Schema execution failed:', error);
      throw error;
    }
  }

  splitStatements(sql) {
    return sql
      .split(/\bGO\b/)
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
  }

  async tableExists(tableName) {
    try {
      const result = await this.pool.request()
        .input('tableName', sql.VarChar, tableName)
        .query(`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME = @tableName
        `);
      return result.recordset[0].count > 0;
    } catch (error) {
      logger.error(`Error checking if table ${tableName} exists:`, error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      logger.info('Starting database migrations...');
      await this.createMigrationsTable();
      
      const migrationsDir = path.join(__dirname, 'migrations');
      const migrations = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const executedMigrations = await this.getExecutedMigrations();

      for (const migration of migrations) {
        if (!executedMigrations.includes(migration)) {
          await this.executeMigration(migration);
        }
      }
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Database migrations failed:', error);
      throw error;
    }
  }

  async createMigrationsTable() {
    try {
      await this.pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Migrations' and xtype='U')
        CREATE TABLE Migrations (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          executedAt DATETIME2 NOT NULL DEFAULT GETDATE()
        )
      `);
    } catch (error) {
      logger.error('Error creating migrations table:', error);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.request()
        .query('SELECT name FROM Migrations');
      return result.recordset.map(row => row.name);
    } catch (error) {
      logger.error('Error getting executed migrations:', error);
      throw error;
    }
  }

  async executeMigration(migrationName) {
    const transaction = new sql.Transaction(this.pool);
    try {
      logger.info(`Executing migration: ${migrationName}`);
      const migrationPath = path.join(__dirname, 'migrations', migrationName);
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');

      await transaction.begin();
      await transaction.request().query(migrationContent);
      await transaction.request()
        .input('name', sql.NVarChar, migrationName)
        .query('INSERT INTO Migrations (name) VALUES (@name)');
      await transaction.commit();
      
      logger.info(`Migration ${migrationName} executed successfully`);
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error executing migration ${migrationName}:`, error);
      throw error;
    }
  }

  async seedDatabase() {
    try {
      logger.info('Starting database seeding...');
      const seedPath = path.join(__dirname, 'seeds.sql');
      
      if (fs.existsSync(seedPath)) {
        const seedContent = fs.readFileSync(seedPath, 'utf8');
        await this.pool.request().query(seedContent);
        logger.info('Database seeding completed successfully');
      } else {
        logger.info('No seed file found');
      }
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }
}

const dbInitializer = new DatabaseInitializer();

// Execute if running directly
if (require.main === module) {
  (async () => {
    try {
      await dbInitializer.initialize();
      await dbInitializer.runMigrations();
      await dbInitializer.seedDatabase();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  })();
}

module.exports = dbInitializer;
