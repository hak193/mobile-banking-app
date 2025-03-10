const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('./logger');

class DocumentService {
  constructor() {
    this.documentsPath = path.join(__dirname, '../../documents');
    this.ensureDirectoryExists(this.documentsPath);
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate account statement PDF
   */
  async generateStatementPDF(statementData) {
    try {
      const doc = new PDFDocument();
      const fileName = `statement_${statementData.accountNumber}_${statementData.period}.pdf`;
      const filePath = path.join(this.documentsPath, 'statements', fileName);

      this.ensureDirectoryExists(path.dirname(filePath));
      const stream = fs.createWriteStream(filePath);

      // Header
      doc.fontSize(20).text('Account Statement', { align: 'center' });
      doc.moveDown();

      // Account Information
      doc.fontSize(12);
      doc.text(`Account Number: ${statementData.accountNumber}`);
      doc.text(`Period: ${statementData.startDate} to ${statementData.endDate}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      // Summary
      doc.fontSize(14).text('Summary');
      doc.fontSize(12);
      doc.text(`Opening Balance: $${statementData.openingBalance}`);
      doc.text(`Closing Balance: $${statementData.closingBalance}`);
      doc.text(`Total Credits: $${statementData.totalCredits}`);
      doc.text(`Total Debits: $${statementData.totalDebits}`);
      doc.moveDown();

      // Transactions
      doc.fontSize(14).text('Transactions');
      doc.moveDown();

      // Transaction table headers
      const startX = 50;
      let currentY = doc.y;
      
      doc.fontSize(10);
      doc.text('Date', startX, currentY);
      doc.text('Description', startX + 100, currentY);
      doc.text('Amount', startX + 300, currentY);
      doc.text('Balance', startX + 400, currentY);

      currentY += 20;

      // Transaction rows
      statementData.transactions.forEach(transaction => {
        if (currentY > 700) { // Check for page overflow
          doc.addPage();
          currentY = 50;
        }

        doc.text(transaction.date, startX, currentY);
        doc.text(transaction.description, startX + 100, currentY);
        doc.text(`$${transaction.amount}`, startX + 300, currentY);
        doc.text(`$${transaction.balance}`, startX + 400, currentY);

        currentY += 20;
      });

      // Footer
      doc.fontSize(8);
      doc.text('This statement is automatically generated and valid without signature.', 50, 750);

      doc.pipe(stream);
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating statement PDF:', error);
      throw error;
    }
  }

  /**
   * Generate transaction receipt PDF
   */
  async generateReceiptPDF(transactionData) {
    try {
      const doc = new PDFDocument();
      const fileName = `receipt_${transactionData.reference}.pdf`;
      const filePath = path.join(this.documentsPath, 'receipts', fileName);

      this.ensureDirectoryExists(path.dirname(filePath));
      const stream = fs.createWriteStream(filePath);

      // Header
      doc.fontSize(20).text('Transaction Receipt', { align: 'center' });
      doc.moveDown();

      // Transaction Details
      doc.fontSize(12);
      doc.text(`Reference Number: ${transactionData.reference}`);
      doc.text(`Date: ${transactionData.date}`);
      doc.text(`Type: ${transactionData.type}`);
      doc.text(`Amount: $${transactionData.amount}`);
      doc.text(`Status: ${transactionData.status}`);
      doc.moveDown();

      // Additional Details
      if (transactionData.type === 'transfer') {
        doc.text(`From Account: ${transactionData.fromAccount}`);
        doc.text(`To Account: ${transactionData.toAccount}`);
      } else if (transactionData.type === 'bill_payment') {
        doc.text(`Biller: ${transactionData.biller}`);
        doc.text(`Bill Reference: ${transactionData.billReference}`);
      }

      // Footer
      doc.fontSize(8);
      doc.text('This is an electronically generated receipt.', 50, 700);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 715);

      doc.pipe(stream);
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating receipt PDF:', error);
      throw error;
    }
  }

  /**
   * Generate statement CSV
   */
  async generateStatementCSV(statementData) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Statement');

      // Add headers
      worksheet.columns = [
        { header: 'Date', key: 'date' },
        { header: 'Description', key: 'description' },
        { header: 'Amount', key: 'amount' },
        { header: 'Balance', key: 'balance' }
      ];

      // Add data
      worksheet.addRows(statementData.transactions);

      // Style the worksheet
      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      const fileName = `statement_${statementData.accountNumber}_${statementData.period}.csv`;
      const filePath = path.join(this.documentsPath, 'statements', fileName);

      this.ensureDirectoryExists(path.dirname(filePath));
      await workbook.csv.writeFile(filePath);

      return filePath;
    } catch (error) {
      logger.error('Error generating statement CSV:', error);
      throw error;
    }
  }

  /**
   * Generate account summary report
   */
  async generateAccountSummaryPDF(accountData) {
    try {
      const doc = new PDFDocument();
      const fileName = `account_summary_${accountData.accountNumber}.pdf`;
      const filePath = path.join(this.documentsPath, 'reports', fileName);

      this.ensureDirectoryExists(path.dirname(filePath));
      const stream = fs.createWriteStream(filePath);

      // Header
      doc.fontSize(20).text('Account Summary', { align: 'center' });
      doc.moveDown();

      // Account Information
      doc.fontSize(12);
      doc.text(`Account Number: ${accountData.accountNumber}`);
      doc.text(`Account Type: ${accountData.accountType}`);
      doc.text(`Current Balance: $${accountData.balance}`);
      doc.moveDown();

      // Monthly Summary
      doc.fontSize(14).text('Monthly Summary');
      doc.fontSize(12);
      accountData.monthlySummary.forEach(month => {
        doc.text(`${month.month}: Credits: $${month.credits}, Debits: $${month.debits}`);
      });

      doc.pipe(stream);
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating account summary:', error);
      throw error;
    }
  }

  /**
   * Clean up old documents
   */
  async cleanupOldDocuments(days = 30) {
    try {
      const directories = ['statements', 'receipts', 'reports'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.documentsPath, dir);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          const age = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

          if (age > days) {
            fs.unlinkSync(filePath);
            logger.info(`Deleted old document: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old documents:', error);
      throw error;
    }
  }
}

module.exports = new DocumentService();
