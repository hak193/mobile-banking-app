const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');
const logger = require('./logger');

class StorageService {
  constructor() {
    this.localStoragePath = config.storage.documentsPath;
    
    if (config.storage.azure.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        config.storage.azure.connectionString
      );
      this.containerClient = this.blobServiceClient.getContainerClient(
        config.storage.azure.containerName
      );
    }

    // Initialize multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.storage.maxFileSize
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  /**
   * File filter for multer
   */
  fileFilter(req, file, cb) {
    const allowedTypes = config.storage.allowedFileTypes;
    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} is not allowed`));
    }
  }

  /**
   * Generate unique filename
   */
  generateFileName(originalName, userId = null) {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const userPrefix = userId ? `${userId}_` : '';
    return `${userPrefix}${timestamp}${ext}`;
  }

  /**
   * Upload file to local storage
   */
  async uploadLocal(file, directory = '') {
    try {
      const fileName = this.generateFileName(file.originalname);
      const filePath = path.join(this.localStoragePath, directory, fileName);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, file.buffer);

      logger.info('File uploaded to local storage:', { fileName });
      
      return {
        fileName,
        path: filePath,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      logger.error('Error uploading file to local storage:', error);
      throw error;
    }
  }

  /**
   * Upload file to Azure Blob Storage
   */
  async uploadToAzure(file, directory = '') {
    try {
      if (!this.containerClient) {
        throw new Error('Azure Blob Storage is not configured');
      }

      const fileName = this.generateFileName(file.originalname);
      const blobPath = directory ? `${directory}/${fileName}` : fileName;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      
      // Upload file
      await blockBlobClient.upload(file.buffer, file.size);

      logger.info('File uploaded to Azure:', { blobPath });
      
      return {
        fileName,
        url: blockBlobClient.url,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      logger.error('Error uploading file to Azure:', error);
      throw error;
    }
  }

  /**
   * Upload file (auto-select storage)
   */
  async uploadFile(file, directory = '') {
    if (this.containerClient && config.storage.preferCloud) {
      return this.uploadToAzure(file, directory);
    }
    return this.uploadLocal(file, directory);
  }

  /**
   * Delete file from local storage
   */
  async deleteLocal(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info('File deleted from local storage:', { filePath });
      return true;
    } catch (error) {
      logger.error('Error deleting file from local storage:', error);
      throw error;
    }
  }

  /**
   * Delete file from Azure Blob Storage
   */
  async deleteFromAzure(blobPath) {
    try {
      if (!this.containerClient) {
        throw new Error('Azure Blob Storage is not configured');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      await blockBlobClient.delete();
      
      logger.info('File deleted from Azure:', { blobPath });
      return true;
    } catch (error) {
      logger.error('Error deleting file from Azure:', error);
      throw error;
    }
  }

  /**
   * Delete file (auto-select storage)
   */
  async deleteFile(filePath, isCloud = false) {
    if (isCloud && this.containerClient) {
      return this.deleteFromAzure(filePath);
    }
    return this.deleteLocal(filePath);
  }

  /**
   * Get file from local storage
   */
  async getLocalFile(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);
      
      return {
        buffer,
        size: stats.size,
        mimeType: this.getMimeType(filePath)
      };
    } catch (error) {
      logger.error('Error reading file from local storage:', error);
      throw error;
    }
  }

  /**
   * Get file from Azure Blob Storage
   */
  async getAzureFile(blobPath) {
    try {
      if (!this.containerClient) {
        throw new Error('Azure Blob Storage is not configured');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      const downloadResponse = await blockBlobClient.download();
      
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      return {
        buffer: Buffer.concat(chunks),
        size: downloadResponse.contentLength,
        mimeType: downloadResponse.contentType
      };
    } catch (error) {
      logger.error('Error downloading file from Azure:', error);
      throw error;
    }
  }

  /**
   * Get file (auto-select storage)
   */
  async getFile(filePath, isCloud = false) {
    if (isCloud && this.containerClient) {
      return this.getAzureFile(filePath);
    }
    return this.getLocalFile(filePath);
  }

  /**
   * List files in directory
   */
  async listFiles(directory = '', isCloud = false) {
    try {
      if (isCloud && this.containerClient) {
        const files = [];
        for await (const blob of this.containerClient.listBlobsFlat({
          prefix: directory
        })) {
          files.push({
            name: blob.name,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
            url: `${this.containerClient.url}/${blob.name}`
          });
        }
        return files;
      } else {
        const dirPath = path.join(this.localStoragePath, directory);
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        const files = await Promise.all(
          entries
            .filter(entry => entry.isFile())
            .map(async entry => {
              const filePath = path.join(dirPath, entry.name);
              const stats = await fs.stat(filePath);
              return {
                name: entry.name,
                path: filePath,
                size: stats.size,
                lastModified: stats.mtime
              };
            })
        );
        
        return files;
      }
    } catch (error) {
      logger.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const now = Date.now();
      
      // Clean local storage
      const localFiles = await this.listFiles();
      for (const file of localFiles) {
        if (now - file.lastModified > maxAge) {
          await this.deleteLocal(file.path);
        }
      }

      // Clean cloud storage
      if (this.containerClient) {
        const cloudFiles = await this.listFiles('', true);
        for (const file of cloudFiles) {
          if (now - file.lastModified > maxAge) {
            await this.deleteFromAzure(file.name);
          }
        }
      }

      logger.info('File cleanup completed');
    } catch (error) {
      logger.error('Error cleaning up files:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();
