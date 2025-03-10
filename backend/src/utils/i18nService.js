const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');
const logger = require('./logger');
const cacheService = require('./cacheService');

class I18nService {
  constructor() {
    this.defaultLanguage = 'en';
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'zh'];
    this.namespaces = ['common', 'errors', 'emails', 'validation'];
    this.cachePrefix = 'i18n:';
    this.cacheDuration = 24 * 60 * 60; // 24 hours

    this.initialize();
  }

  /**
   * Initialize i18next
   */
  async initialize() {
    try {
      await i18next
        .use(Backend)
        .init({
          backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
          },
          fallbackLng: this.defaultLanguage,
          supportedLngs: this.supportedLanguages,
          ns: this.namespaces,
          defaultNS: 'common',
          preload: this.supportedLanguages,
          load: 'languageOnly',
          debug: config.env === 'development',
          interpolation: {
            escapeValue: false
          },
          saveMissing: config.env === 'development',
          saveMissingTo: 'fallback',
          missingKeyHandler: (lng, ns, key) => {
            logger.warn('Missing translation:', { lng, ns, key });
          }
        });

      logger.info('i18n service initialized');
    } catch (error) {
      logger.error('Error initializing i18n service:', error);
      throw error;
    }
  }

  /**
   * Translate text
   */
  async translate(key, options = {}, language = this.defaultLanguage) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(key, language, options);
      const cachedTranslation = await cacheService.get(cacheKey);
      
      if (cachedTranslation) {
        return cachedTranslation;
      }

      // Get translation
      const translation = i18next.t(key, {
        lng: language,
        ...options
      });

      // Cache translation
      await cacheService.set(cacheKey, translation, this.cacheDuration);

      return translation;
    } catch (error) {
      logger.error('Translation error:', error);
      return key; // Return key as fallback
    }
  }

  /**
   * Get cache key for translation
   */
  getCacheKey(key, language, options) {
    const optionsHash = JSON.stringify(options);
    return `${this.cachePrefix}${language}:${key}:${optionsHash}`;
  }

  /**
   * Add translation
   */
  async addTranslation(language, namespace, key, value) {
    try {
      const filePath = path.join(__dirname, `../locales/${language}/${namespace}.json`);
      let translations = {};

      // Read existing translations
      try {
        const content = await fs.readFile(filePath, 'utf8');
        translations = JSON.parse(content);
      } catch (error) {
        // File doesn't exist or is invalid, use empty object
      }

      // Add new translation
      translations[key] = value;

      // Write updated translations
      await fs.writeFile(filePath, JSON.stringify(translations, null, 2));

      // Reload namespace
      await i18next.reloadResources([language], [namespace]);

      // Clear cache for this language/namespace
      await this.clearNamespaceCache(language, namespace);

      logger.info('Translation added:', { language, namespace, key });
      return true;
    } catch (error) {
      logger.error('Error adding translation:', error);
      throw error;
    }
  }

  /**
   * Clear cache for namespace
   */
  async clearNamespaceCache(language, namespace) {
    const pattern = `${this.cachePrefix}${language}:${namespace}:*`;
    await cacheService.clearPattern(pattern);
  }

  /**
   * Get all translations for language
   */
  async getTranslations(language) {
    try {
      const translations = {};
      
      for (const namespace of this.namespaces) {
        translations[namespace] = await i18next.getResourceBundle(language, namespace);
      }

      return translations;
    } catch (error) {
      logger.error('Error getting translations:', error);
      throw error;
    }
  }

  /**
   * Detect language from request
   */
  detectLanguage(req) {
    // Check query parameter
    if (req.query.lang && this.isSupported(req.query.lang)) {
      return req.query.lang;
    }

    // Check header
    const acceptLanguage = req.get('Accept-Language');
    if (acceptLanguage) {
      const language = acceptLanguage.split(',')[0].split('-')[0];
      if (this.isSupported(language)) {
        return language;
      }
    }

    // Check user preference if authenticated
    if (req.user && req.user.preferredLanguage && this.isSupported(req.user.preferredLanguage)) {
      return req.user.preferredLanguage;
    }

    return this.defaultLanguage;
  }

  /**
   * Check if language is supported
   */
  isSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Format date according to locale
   */
  formatDate(date, options = {}, language = this.defaultLanguage) {
    return new Intl.DateTimeFormat(language, options).format(date);
  }

  /**
   * Format number according to locale
   */
  formatNumber(number, options = {}, language = this.defaultLanguage) {
    return new Intl.NumberFormat(language, options).format(number);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount, currency = 'USD', language = this.defaultLanguage) {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Create i18n middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      const language = this.detectLanguage(req);
      req.language = language;
      
      // Add translation helper to response locals
      res.locals.t = (key, options = {}) => {
        return i18next.t(key, { lng: language, ...options });
      };

      // Add formatting helpers to response locals
      res.locals.formatDate = (date, options = {}) => {
        return this.formatDate(date, options, language);
      };

      res.locals.formatNumber = (number, options = {}) => {
        return this.formatNumber(number, options, language);
      };

      res.locals.formatCurrency = (amount, currency) => {
        return this.formatCurrency(amount, currency, language);
      };

      next();
    };
  }
}

module.exports = new I18nService();
