# 🚀 Disfruta P2P Lending Platform - Complete Development & Maintenance Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Setup Instructions](#setup-instructions)
4. [Development Workflow](#development-workflow)
5. [Deployment Guide](#deployment-guide)
6. [Maintenance Procedures](#maintenance-procedures)
7. [API Documentation](#api-documentation)
8. [Troubleshooting](#troubleshooting)
9. [File Structure](#file-structure)
10. [Technology Stack](#technology-stack)

---

## 🎯 Project Overview

**Disfruta** is a comprehensive peer-to-peer lending platform built on modern web technologies with blockchain integration capabilities. The platform enables secure lending and borrowing transactions with advanced features like credit scoring, KYC verification, and investment management.

### Key Features
- **User Management**: Registration, authentication, KYC verification
- **Loan Management**: Create, browse, and manage loan requests
- **Investment System**: Portfolio management and investment tracking
- **Credit Scoring**: Advanced credit assessment algorithms
- **Security**: JWT authentication, input validation, CORS protection
- **Blockchain Ready**: Smart contract integration prepared

---

## 🏗️ Architecture Overview

### Frontend Architecture (React + Vite)
```
src/
├── components/          # Reusable UI components
├── pages/              # Route-specific page components
├── services/           # API communication layer
├── store/              # Redux state management
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
└── abis/               # Smart contract ABIs
```

### Backend Architecture (Node.js + Express)
```
backend/
├── controllers/        # Request handlers
├── models/            # Database schemas
├── routes/            # API route definitions
├── middleware/        # Custom middleware
├── services/          # Business logic
├── utils/             # Utility functions
└── config/            # Configuration files
```

### Database Design
- **Users**: Authentication, profile, KYC status
- **Loans**: Loan requests, terms, status
- **Investments**: Investment records, portfolio
- **Transactions**: Payment history, transfers
- **Credit Scores**: User creditworthiness data

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or pnpm package manager
- MongoDB (local or Atlas)
- Git

### Local Development Setup

#### 1. Clone and Install
```bash
# Extract the zip file
unzip projecto-v2-dis.zip
cd disfruta-platform

# Install dependencies
npm install
# or
pnpm install
```

#### 2. Environment Configuration

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000
VITE_BLOCKCHAIN_NETWORK=localhost
VITE_CONTRACT_ADDRESS=your_contract_address
```

**Backend (.env)**
```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/disfruta
# or MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/disfruta

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=7d

CORS_ORIGIN=http://localhost:5173

# Email Configuration (optional)
EMAIL_FROM=noreply@disfruta.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### 3. Database Setup
```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env file
```

#### 4. Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
# Backend
cd backend && npm run dev

# Frontend (new terminal)
npm run dev
```

#### 5. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Health: http://localhost:8000/health

---

## 🔄 Development Workflow

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Code Standards
- **ESLint**: Automated code linting
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages

### Testing
```bash
# Run frontend tests
npm run test

# Run backend tests
cd backend && npm test

# Run E2E tests
npm run test:e2e
```

### Smart Contract Development
```bash
# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Run contract tests
npx hardhat test
```

---

## 🚀 Deployment Guide

### Production Environment Setup

#### 1. Server Requirements
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- MongoDB 5.0+
- Nginx (reverse proxy)
- SSL certificate

#### 2. Backend Deployment
```bash
# Install PM2 for process management
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name "disfruta-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 3. Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to web server (nginx)
sudo cp -r dist/* /var/www/disfruta/
```

#### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        root /var/www/disfruta;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 5. Database Migration
```bash
# Backup current database
mongodump --uri="mongodb://localhost:27017/disfruta" --out backup/

# Restore to production
mongorestore --uri="mongodb://prod-server:27017/disfruta" backup/disfruta/
```

---

## 🔧 Maintenance Procedures

### Daily Monitoring
- Check server logs: `pm2 logs`
- Monitor API health: `curl https://api.domain.com/health`
- Database connection status
- SSL certificate expiration

### Weekly Tasks
- Database backup
- Security updates
- Performance metrics review
- User feedback analysis

### Monthly Tasks
- Full system backup
- Dependency updates
- Security audit
- Performance optimization

### Backup Strategy
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/disfruta/$DATE"

# Database backup
mongodump --uri="$MONGODB_URI" --out "$BACKUP_DIR/db"

# Code backup
tar -czf "$BACKUP_DIR/code.tar.gz" /var/www/disfruta

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR" s3://your-backup-bucket/ --recursive
```

### Log Management
```bash
# View application logs
pm2 logs disfruta-api

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Rotate logs weekly
sudo logrotate -f /etc/logrotate.d/nginx
```

---

## 📡 API Documentation

### Authentication Endpoints
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### User Management
```
GET /api/users/profile
PUT /api/users/profile
POST /api/users/verify-kyc
GET /api/users/credit-score
```

### Loan Management
```
GET /api/loans
POST /api/loans
GET /api/loans/:id
PUT /api/loans/:id
POST /api/loans/:id/apply
```

### Investment Management
```
GET /api/investments
POST /api/investments
GET /api/investments/portfolio
PUT /api/investments/:id
```

### Example API Usage
```javascript
// User Registration
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    userType: 'borrower'
  })
});
```

---

## 🐛 Troubleshooting

### Common Issues

#### Frontend Issues
**Problem**: Build fails with dependency errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem**: API calls failing
```javascript
// Check CORS settings in backend
// Verify API_URL in frontend .env
console.log('API URL:', import.meta.env.VITE_API_URL);
```

#### Backend Issues
**Problem**: Database connection failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connection
mongo --eval "db.adminCommand('ismaster')"
```

**Problem**: JWT token errors
```bash
# Verify JWT_SECRET in .env
# Check token expiration settings
```

#### Performance Issues
**Problem**: Slow API responses
```bash
# Check database indexes
# Monitor server resources
top
htop
df -h
```

#### Security Issues
**Problem**: CORS errors
```javascript
// Update CORS settings in backend
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
```

---

## 📁 File Structure

### Project Root
```
disfruta-platform/
├── README.md                 # Project documentation
├── package.json             # Frontend dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── hardhat.config.js        # Hardhat blockchain config
├── .env                     # Frontend environment
├── .gitignore              # Git ignore rules
│
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── store/             # Redux store
│   ├── utils/             # Utilities
│   ├── hooks/             # Custom hooks
│   ├── abis/              # Smart contract ABIs
│   └── __tests__/         # Test files
│
├── backend/               # Backend source code
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   ├── .env               # Backend environment
│   ├── controllers/       # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic
│   ├── utils/             # Backend utilities
│   └── config/            # Configuration
│
├── contracts/             # Smart contracts
│   ├── LoanFactory.sol
│   ├── Loan.sol
│   ├── UserRegistry.sol
│   └── ...
│
├── scripts/               # Deployment scripts
│   └── deploy.js
│
└── test/                  # Contract tests
    └── ...
```

### Documentation Files
```
docs/
├── prd.md                 # Product Requirements Document
├── system_design.md       # System Architecture
├── api_documentation.md   # API Reference
└── user_guide.md         # End-user documentation
```

---

## 💻 Technology Stack

### Frontend
- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Redux Toolkit**: State management
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS
- **React Hook Form**: Form handling
- **Axios**: HTTP client
- **Ethers.js**: Blockchain interaction

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB
- **JWT**: Authentication
- **Bcrypt**: Password hashing
- **Joi**: Input validation
- **CORS**: Cross-origin resource sharing

### Blockchain
- **Hardhat**: Development environment
- **Solidity**: Smart contract language
- **OpenZeppelin**: Security libraries
- **Ethers.js**: Blockchain interaction

### DevOps & Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **PM2**: Process management
- **Nginx**: Reverse proxy
- **Docker**: Containerization (optional)

---

## 🤝 Contributing

### Development Guidelines
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

### Code Review Process
1. Automated checks (linting, tests)
2. Security review
3. Performance assessment
4. Code quality review
5. Final approval and merge

---

## 📞 Support & Contact

### Getting Help
- **Documentation**: Check this guide first
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Security**: Report security issues privately

### Maintenance Team
- **Lead Developer**: [Your Name]
- **DevOps Engineer**: [Team Member]
- **Security Specialist**: [Team Member]

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🔄 Version History

### v2.0.0 (Current)
- Complete platform rewrite
- Modern React frontend
- RESTful API backend
- Blockchain integration ready
- Enhanced security features

### v1.0.0
- Initial platform release
- Basic lending functionality
- User authentication
- Simple UI interface

---

**Last Updated**: June 2025  
**Document Version**: 2.0  
**Platform Version**: 2.0.0

---

> 💡 **Tip**: Keep this guide updated as the platform evolves. Regular documentation updates ensure smooth onboarding and maintenance processes.

🚀 **Happy Coding!** 🚀