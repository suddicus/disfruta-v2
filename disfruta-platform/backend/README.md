# Disfruta P2P Lending Platform - Backend API

A comprehensive Node.js/Express backend API for the Disfruta peer-to-peer lending platform, featuring user authentication, loan management, investment tracking, payment processing, and blockchain integration.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Registration, KYC verification, profile management
- **Loan Operations**: Loan applications, approval workflow, funding management
- **Investment Tracking**: Portfolio management, performance analytics
- **Payment Processing**: Automated payment schedules, distribution to investors
- **Credit Scoring**: Dynamic credit assessment and risk evaluation
- **Blockchain Integration**: Smart contract deployment and transaction handling
- **Admin Dashboard**: Platform statistics, user management, loan approvals
- **File Upload**: Document management for KYC and loan applications
- **Email Notifications**: Automated email system for user communications
- **Security**: Rate limiting, input validation, data sanitization

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **Blockchain**: Ethers.js
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Documentation**: OpenAPI/Swagger ready

## 📋 Prerequisites

- Node.js (v16.0.0 or higher)
- MongoDB (v4.4 or higher)
- npm or pnpm package manager

## 🔧 Installation

1. **Clone the repository**
   

2. **Install dependencies**
   

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Configure your environment variables:
   

4. **Configure Environment Variables**
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/disfruta
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
   JWT_EXPIRE=7d
   
   # Server
   NODE_ENV=development
   PORT=8000
   FRONTEND_URL=http://localhost:5173
   
   # Email (Optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

5. **Start MongoDB**
   

6. **Run the application**
   

The API will be available at `http://localhost:8000`

## 📚 API Documentation

### Authentication Endpoints

#### Register User