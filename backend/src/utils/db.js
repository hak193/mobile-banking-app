const sql = require('mssql');
const config = require('../config');
const logger = require('./logger');

class Database {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  async connect() {
    try {
      if (this.connected) {
        return this.pool;
      }

      this.pool = await sql.connect(config.db);
      this.connected = true;
      logger.info('Successfully connected to the database');
      return this.pool;
    } catch (error) {
      logger.error('Database connection error:', error);
      throw error;
    }
  }

  async query(text, params = []) {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const request = this.pool.request();
      
      // Add parameters to the request
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      const result = await request.query(text);
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        query: text,
        params,
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.connected) {
      await this.connect();
    }

    const transaction = new sql.Transaction(this.pool);
    
    try {
      await transaction.begin();
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      logger.error('Transaction error:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.connected = false;
        logger.info('Database connection closed');
      }
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Helper methods for common operations
  async findOne(table, conditions, fields = '*') {
    const whereClause = Object.entries(conditions)
      .map(([key, _], index) => `${key} = @param${index}`)
      .join(' AND ');

    const query = `SELECT ${fields} FROM ${table} WHERE ${whereClause}`;
    const result = await this.query(query, Object.values(conditions));
    return result.recordset[0];
  }

  async findMany(table, conditions = {}, fields = '*', options = {}) {
    let query = `SELECT ${fields} FROM ${table}`;

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key, _], index) => `${key} = @param${index}`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` OFFSET ${options.offset || 0} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
    }

    const result = await this.query(query, Object.values(conditions));
    return result.recordset;
  }

  async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const values = Object.keys(data)
      .map((_, index) => `@param${index}`)
      .join(', ');

    const query = `
      INSERT INTO ${table} (${columns})
      OUTPUT INSERTED.*
      VALUES (${values})
    `;

    const result = await this.query(query, Object.values(data));
    return result.recordset[0];
  }

  async update(table, conditions, data) {
    const setClause = Object.keys(data)
      .map((key, index) => `${key} = @param${index}`)
      .join(', ');

    const whereClause = Object.entries(conditions)
      .map(([key, _], index) => `${key} = @param${Object.keys(data).length + index}`)
      .join(' AND ');

    const query = `
      UPDATE ${table}
      SET ${setClause}
      OUTPUT INSERTED.*
      WHERE ${whereClause}
    `;

    const result = await this.query(query, [...Object.values(data), ...Object.values(conditions)]);
    return result.recordset[0];
  }

  async delete(table, conditions) {
    const whereClause = Object.entries(conditions)
      .map(([key, _], index) => `${key} = @param${index}`)
      .join(' AND ');

    const query = `
      DELETE FROM ${table}
      OUTPUT DELETED.*
      WHERE ${whereClause}
    `;

    const result = await this.query(query, Object.values(conditions));
    return result.recordset[0];
  }
}

// Create and export a single instance
const db = new Database();
module.exports = db;
