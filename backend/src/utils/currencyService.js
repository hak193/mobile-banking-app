const axios = require('axios');
const config = require('../config');
const logger = require('./logger');
const cacheService = require('./cacheService');

class CurrencyService {
  constructor() {
    this.baseUrl = config.exchangeRate.apiUrl;
    this.apiKey = config.exchangeRate.apiKey;
    this.baseCurrency = 'USD';
    this.defaultCacheDuration = 3600; // 1 hour in seconds
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates(baseCurrency = this.baseCurrency) {
    const cacheKey = `exchange_rates:${baseCurrency}`;
    
    try {
      // Check cache first
      const cachedRates = await cacheService.get(cacheKey);
      if (cachedRates) {
        return cachedRates;
      }

      // Fetch fresh rates
      const response = await axios.get(`${this.baseUrl}/latest`, {
        params: {
          base: baseCurrency,
          apikey: this.apiKey
        }
      });

      const rates = response.data.rates;
      
      // Cache the results
      await cacheService.set(cacheKey, rates, this.defaultCacheDuration);
      
      return rates;
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      const rates = await this.getExchangeRates(this.baseCurrency);
      
      // Convert to base currency first if needed
      let baseAmount = amount;
      if (fromCurrency !== this.baseCurrency) {
        baseAmount = amount / rates[fromCurrency];
      }

      // Convert to target currency
      const convertedAmount = baseAmount * rates[toCurrency];
      
      return this.roundAmount(convertedAmount);
    } catch (error) {
      logger.error('Error converting currency:', error);
      throw error;
    }
  }

  /**
   * Get historical exchange rate
   */
  async getHistoricalRate(date, fromCurrency, toCurrency) {
    const cacheKey = `historical_rate:${date}:${fromCurrency}:${toCurrency}`;
    
    try {
      // Check cache first
      const cachedRate = await cacheService.get(cacheKey);
      if (cachedRate) {
        return cachedRate;
      }

      // Fetch historical rate
      const response = await axios.get(`${this.baseUrl}/historical`, {
        params: {
          date,
          base: fromCurrency,
          symbols: toCurrency,
          apikey: this.apiKey
        }
      });

      const rate = response.data.rates[toCurrency];
      
      // Cache the result
      await cacheService.set(cacheKey, rate, this.defaultCacheDuration * 24); // Cache for 24 hours
      
      return rate;
    } catch (error) {
      logger.error('Error fetching historical rate:', error);
      throw error;
    }
  }

  /**
   * Format currency amount
   */
  formatAmount(amount, currency, locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Round amount to appropriate decimal places
   */
  roundAmount(amount, decimals = 2) {
    return Number(Math.round(amount + 'e' + decimals) + 'e-' + decimals);
  }

  /**
   * Calculate fees
   */
  calculateFees(amount, feeStructure) {
    let totalFee = 0;

    // Fixed fee
    if (feeStructure.fixed) {
      totalFee += feeStructure.fixed;
    }

    // Percentage fee
    if (feeStructure.percentage) {
      totalFee += (amount * feeStructure.percentage) / 100;
    }

    // Apply minimum fee if set
    if (feeStructure.minimum && totalFee < feeStructure.minimum) {
      totalFee = feeStructure.minimum;
    }

    // Apply maximum fee if set
    if (feeStructure.maximum && totalFee > feeStructure.maximum) {
      totalFee = feeStructure.maximum;
    }

    return this.roundAmount(totalFee);
  }

  /**
   * Calculate total with fees
   */
  calculateTotalWithFees(amount, feeStructure) {
    const fees = this.calculateFees(amount, feeStructure);
    return this.roundAmount(amount + fees);
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies() {
    const cacheKey = 'supported_currencies';
    
    try {
      // Check cache first
      const cachedCurrencies = await cacheService.get(cacheKey);
      if (cachedCurrencies) {
        return cachedCurrencies;
      }

      // Fetch supported currencies
      const response = await axios.get(`${this.baseUrl}/currencies`, {
        params: {
          apikey: this.apiKey
        }
      });

      const currencies = response.data;
      
      // Cache the results
      await cacheService.set(cacheKey, currencies, this.defaultCacheDuration * 24 * 7); // Cache for 7 days
      
      return currencies;
    } catch (error) {
      logger.error('Error fetching supported currencies:', error);
      throw error;
    }
  }

  /**
   * Calculate compound interest
   */
  calculateCompoundInterest(principal, rate, time, frequency = 12) {
    const r = rate / 100;
    const n = frequency;
    const t = time;
    
    return this.roundAmount(
      principal * Math.pow(1 + r/n, n*t)
    );
  }

  /**
   * Calculate loan payment
   */
  calculateLoanPayment(principal, rate, term) {
    const r = (rate / 100) / 12;
    const n = term * 12;
    
    const payment = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    
    return this.roundAmount(payment);
  }

  /**
   * Calculate loan amortization schedule
   */
  calculateAmortizationSchedule(principal, rate, term) {
    const monthlyPayment = this.calculateLoanPayment(principal, rate, term);
    const monthlyRate = (rate / 100) / 12;
    const totalMonths = term * 12;
    
    let balance = principal;
    const schedule = [];

    for (let month = 1; month <= totalMonths; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      schedule.push({
        month,
        payment: this.roundAmount(monthlyPayment),
        principal: this.roundAmount(principalPayment),
        interest: this.roundAmount(interestPayment),
        balance: this.roundAmount(balance)
      });
    }

    return schedule;
  }

  /**
   * Validate currency code
   */
  async isValidCurrency(currencyCode) {
    const currencies = await this.getSupportedCurrencies();
    return currencies.hasOwnProperty(currencyCode);
  }
}

module.exports = new CurrencyService();
