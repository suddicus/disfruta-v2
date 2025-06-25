# Project Summary
The Disfruta project is a peer-to-peer lending platform that utilizes blockchain technology to facilitate accessible credit solutions. It connects underserved borrowers with alternative investors through secure smart contracts, thereby enhancing the lending experience for individuals and small businesses. The platform prioritizes user satisfaction with robust authentication, credit assessment mechanisms, and efficient loan management, while also offering attractive returns for investors.

# Project Module Description
- **Smart Contracts**: Securely manages loan creation, funding, and repayment processes.
- **Frontend Application**: Developed with React and Tailwind CSS, featuring user authentication, dashboards, and wallet integration.
- **Credit Scoring**: On-chain evaluation of borrower creditworthiness using varied data sources.
- **Treasury Management**: Manages platform fees and reserve fund allocations.
- **Testing Framework**: Comprehensive testing suites for smart contracts and frontend components.
- **Backend API**: Built with Node.js and Express, handling authentication, user operations, and loan functionalities.

# Directory Tree
```
disfruta-platform/
├── backend/                  # Node.js/Express backend
│   ├── config/               # Configuration files
│   ├── controllers/          # Controllers for handling requests
│   ├── middleware/           # Middleware for authentication and validation
│   ├── models/               # Database models
│   ├── routes/               # API routes
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   ├── .env.example          # Example environment variables
│   └── README.md             # Backend documentation
├── contracts/                # Smart contracts for the platform
├── scripts/                  # Deployment scripts
├── src/                      # Frontend source code
├── test/                     # Test files for smart contracts
├── package.json              # Project dependencies and scripts
└── hardhat.config.cjs        # Hardhat configuration for smart contract development
```

# File Description Inventory
- **backend/**: Implementation of the Node.js/Express backend, including authentication and loan management.
- **contracts/**: Hosts Solidity smart contracts for core lending functionalities.
- **scripts/deploy.js**: Script for deploying smart contracts to a blockchain network.
- **src/**: Contains all frontend code, including components and services for user interaction and blockchain integration.
- **test/**: Contains unit and integration tests for smart contracts.
- **package.json**: Lists project dependencies and scripts for building and running the application.
- **hardhat.config.cjs**: Configuration file for Hardhat, a development environment for Ethereum software.
- **src/services/api.js**: Connects the frontend to backend APIs for authentication and data operations.
- **backend/config/database.js**: Configuration for database connection settings.

# Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Blockchain**: Solidity, Hardhat, ethers.js
- **Database**: MongoDB (local development), with options for cloud
- **Infrastructure**: Docker, Kubernetes, AWS/GCP

# Usage
1. **Install Dependencies**: Run `npm install` or `pnpm install` to install all project dependencies.
2. **Build the Project**: Use `npm run build` to compile the frontend application.
3. **Run Tests**: Execute `npm run test:contracts` to run all smart contract tests.
4. **Deploy Contracts**: Use `npm run deploy:local` to deploy smart contracts to a local blockchain.
5. **Start the Backend**: Run `node server.js` in the backend directory to start the backend server.
6. **Start the Application**: Run `npm run dev` or `pnpm run dev` to start the frontend development server.
