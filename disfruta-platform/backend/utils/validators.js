const { body, param, query } = require('express-validator');

// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Password strength validation
const isStrongPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

// Credit card validation (Luhn algorithm)
const isValidCreditCard = (cardNumber) => {
  const num = cardNumber.replace(/\s/g, '');
  if (!/^\d+$/.test(num)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// SSN validation
const isValidSSN = (ssn) => {
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  return ssnRegex.test(ssn);
};

// Bank account validation
const isValidBankAccount = (accountNumber) => {
  return /^\d{8,17}$/.test(accountNumber);
};

// Routing number validation
const isValidRoutingNumber = (routingNumber) => {
  if (!/^\d{9}$/.test(routingNumber)) return false;
  
  // ABA routing number checksum validation
  const digits = routingNumber.split('').map(Number);
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;
  
  return checksum === 0;
};

// Ethereum address validation
const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// ZIP code validation
const isValidZipCode = (zipCode) => {
  return /^\d{5}(-\d{4})?$/.test(zipCode);
};

// Amount validation (positive number with up to 2 decimal places)
const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && /^\d+(\.\d{1,2})?$/.test(amount.toString());
};

// Interest rate validation (0.1% to 50%)
const isValidInterestRate = (rate) => {
  const num = parseFloat(rate);
  return !isNaN(num) && num >= 0.1 && num <= 50;
};

// Loan term validation (1 to 60 months)
const isValidLoanTerm = (term) => {
  const num = parseInt(term);
  return !isNaN(num) && num >= 1 && num <= 60;
};

// File type validation
const isValidFileType = (mimetype, allowedTypes = []) => {
  return allowedTypes.includes(mimetype);
};

// File size validation (in bytes)
const isValidFileSize = (size, maxSize = 10 * 1024 * 1024) => { // 10MB default
  return size <= maxSize;
};

// Date validation
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Future date validation
const isFutureDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
};

// Past date validation
const isPastDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
};

// Age validation (18+)
const isValidAge = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 18;
  }
  
  return age >= 18;
};

// Express validator middleware
const validateLoanAmount = () => {
  return body('amount')
    .custom((value) => {
      if (!isValidAmount(value)) {
        throw new Error('Invalid loan amount format');
      }
      const num = parseFloat(value);
      if (num < 100 || num > 1000000) {
        throw new Error('Loan amount must be between $100 and $1,000,000');
      }
      return true;
    });
};

const validateEmail = (field = 'email') => {
  return body(field)
    .isEmail()
    .normalizeEmail()
    .custom((value) => {
      if (!isValidEmail(value)) {
        throw new Error('Please provide a valid email address');
      }
      return true;
    });
};

const validatePassword = (field = 'password') => {
  return body(field)
    .custom((value) => {
      if (!isStrongPassword(value)) {
        throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }
      return true;
    });
};

const validatePhone = (field = 'phone') => {
  return body(field)
    .optional()
    .custom((value) => {
      if (value && !isValidPhone(value)) {
        throw new Error('Please provide a valid phone number');
      }
      return true;
    });
};

const validateBankAccount = () => {
  return [
    body('accountNumber')
      .custom((value) => {
        if (!isValidBankAccount(value)) {
          throw new Error('Invalid bank account number format');
        }
        return true;
      }),
    body('routingNumber')
      .custom((value) => {
        if (!isValidRoutingNumber(value)) {
          throw new Error('Invalid routing number');
        }
        return true;
      })
  ];
};

const validateEthereumAddress = (field = 'walletAddress') => {
  return body(field)
    .optional()
    .custom((value) => {
      if (value && !isValidEthereumAddress(value)) {
        throw new Error('Invalid Ethereum address format');
      }
      return true;
    });
};

const validateDateRange = (startField, endField) => {
  return [
    body(startField)
      .optional()
      .isISO8601()
      .toDate(),
    body(endField)
      .optional()
      .isISO8601()
      .toDate()
      .custom((endDate, { req }) => {
        if (req.body[startField] && endDate < new Date(req.body[startField])) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ];
};

const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ];
};

const validateMongoId = (field = 'id') => {
  return param(field)
    .isMongoId()
    .withMessage('Invalid ID format');
};

module.exports = {
  // Validation functions
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  isValidCreditCard,
  isValidSSN,
  isValidBankAccount,
  isValidRoutingNumber,
  isValidEthereumAddress,
  isValidZipCode,
  isValidAmount,
  isValidInterestRate,
  isValidLoanTerm,
  isValidFileType,
  isValidFileSize,
  isValidDate,
  isFutureDate,
  isPastDate,
  isValidAge,
  
  // Express validator middleware
  validateLoanAmount,
  validateEmail,
  validatePassword,
  validatePhone,
  validateBankAccount,
  validateEthereumAddress,
  validateDateRange,
  validatePagination,
  validateMongoId
};