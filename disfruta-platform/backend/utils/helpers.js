const crypto = require('crypto');
const moment = require('moment');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
const generateRandomString = (length = 32, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Generate a secure random token
 * @param {number} bytes - Number of bytes for the token
 * @returns {string} Hex encoded token
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a password using bcrypt-like algorithm
 * @param {string} text - Text to hash
 * @param {string} salt - Salt for hashing
 * @returns {string} Hashed text
 */
const hashText = (text, salt = null) => {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(text, salt, 10000, 64, 'sha512');
  return salt + ':' + hash.toString('hex');
};

/**
 * Verify hashed text
 * @param {string} text - Plain text to verify
 * @param {string} hashedText - Hashed text to compare against
 * @returns {boolean} True if text matches hash
 */
const verifyHash = (text, hashedText) => {
  const [salt, hash] = hashedText.split(':');
  const newHash = crypto.pbkdf2Sync(text, salt, 10000, 64, 'sha512').toString('hex');
  return hash === newHash;
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
const formatPercentage = (value, decimals = 2) => {
  return (value).toFixed(decimals) + '%';
};

/**
 * Calculate monthly payment for a loan
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (as decimal)
 * @param {number} termMonths - Loan term in months
 * @returns {number} Monthly payment amount
 */
const calculateMonthlyPayment = (principal, annualRate, termMonths) => {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                        (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Math.round(monthlyPayment * 100) / 100;
};

/**
 * Calculate total interest for a loan
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate (as decimal)
 * @param {number} termMonths - Loan term in months
 * @returns {number} Total interest amount
 */
const calculateTotalInterest = (principal, annualRate, termMonths) => {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  return (monthlyPayment * termMonths) - principal;
};

/**
 * Calculate compound interest
 * @param {number} principal - Initial amount
 * @param {number} rate - Interest rate (as decimal)
 * @param {number} time - Time period
 * @param {number} compound - Compounding frequency per time period
 * @returns {number} Final amount after compound interest
 */
const calculateCompoundInterest = (principal, rate, time, compound = 12) => {
  return principal * Math.pow((1 + rate / compound), compound * time);
};

/**
 * Paginate array
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} Paginated result with data and metadata
 */
const paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);
  const totalPages = Math.ceil(array.length / limit);
  
  return {
    data: paginatedItems,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: array.length,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Sanitize user input
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
};

/**
 * Generate loan reference number
 * @param {string} prefix - Prefix for the loan number
 * @returns {string} Loan reference number
 */
const generateLoanNumber = (prefix = 'LN') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

/**
 * Calculate business days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of business days
 */
const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const curDate = new Date(startDate);
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  return count;
};

/**
 * Add business days to a date
 * @param {Date} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {Date} New date after adding business days
 */
const addBusinessDays = (date, days) => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      addedDays++;
    }
  }
  
  return result;
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (moment.js format)
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'MMMM Do, YYYY') => {
  return moment(date).format(format);
};

/**
 * Get time ago string
 * @param {Date|string} date - Date to calculate from
 * @returns {string} Time ago string (e.g., "2 hours ago")
 */
const getTimeAgo = (date) => {
  return moment(date).fromNow();
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Promise that resolves with the function result
 */
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === maxRetries) break;
      
      await sleep(delay * Math.pow(2, i));
    }
  }
  
  throw lastError;
};

/**
 * Validate and parse environment variables
 * @param {string} envVar - Environment variable name
 * @param {any} defaultValue - Default value if env var is not set
 * @param {string} type - Expected type (string, number, boolean)
 * @returns {any} Parsed environment variable value
 */
const getEnvVar = (envVar, defaultValue = null, type = 'string') => {
  const value = process.env[envVar];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  switch (type) {
    case 'number':
      return isNaN(Number(value)) ? defaultValue : Number(value);
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    default:
      return value;
  }
};

module.exports = {
  generateRandomString,
  generateSecureToken,
  hashText,
  verifyHash,
  formatCurrency,
  formatPercentage,
  calculateMonthlyPayment,
  calculateTotalInterest,
  calculateCompoundInterest,
  paginate,
  sanitizeInput,
  generateLoanNumber,
  calculateBusinessDays,
  addBusinessDays,
  formatDate,
  getTimeAgo,
  deepClone,
  isEmpty,
  sleep,
  retryWithBackoff,
  getEnvVar
};