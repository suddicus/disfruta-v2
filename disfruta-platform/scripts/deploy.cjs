// scripts/deploy.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Starting Disfruta Platform deployment...");
  
  // Get deployment accounts
  const [deployer, treasury, operational, development, stakeholder] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy UserRegistry first
  console.log("\n1. Deploying UserRegistry...");
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.deployed();
  console.log("UserRegistry deployed to:", userRegistry.address);
  
  // Deploy CreditScoring
  console.log("\n2. Deploying CreditScoring...");
  const CreditScoring = await ethers.getContractFactory("CreditScoring");
  const creditScoring = await CreditScoring.deploy();
  await creditScoring.deployed();
  console.log("CreditScoring deployed to:", creditScoring.address);
  
  // Deploy Treasury
  console.log("\n3. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasuryContract = await Treasury.deploy(
    operational.address,
    development.address,
    stakeholder.address
  );
  await treasuryContract.deployed();
  console.log("Treasury deployed to:", treasuryContract.address);
  
  // Deploy LoanFactory
  console.log("\n4. Deploying LoanFactory...");
  const LoanFactory = await ethers.getContractFactory("LoanFactory");
  const loanFactory = await LoanFactory.deploy(
    userRegistry.address,
    creditScoring.address
  );
  await loanFactory.deployed();
  console.log("LoanFactory deployed to:", loanFactory.address);
  
  // Deploy LendingPool
  console.log("\n5. Deploying LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(loanFactory.address);
  await lendingPool.deployed();
  console.log("LendingPool deployed to:", lendingPool.address);
  
  // Configure contracts
  console.log("\n6. Configuring contracts...");
  
  // Grant roles in UserRegistry
  const KYC_VERIFIER_ROLE = await userRegistry.KYC_VERIFIER_ROLE();
  const COMPLIANCE_OFFICER_ROLE = await userRegistry.COMPLIANCE_OFFICER_ROLE();
  await userRegistry.grantRole(KYC_VERIFIER_ROLE, deployer.address);
  await userRegistry.grantRole(COMPLIANCE_OFFICER_ROLE, deployer.address);
  console.log("✓ UserRegistry roles configured");
  
  // Grant roles in CreditScoring
  const CREDIT_ANALYST_ROLE = await creditScoring.CREDIT_ANALYST_ROLE();
  const LOAN_REPORTER_ROLE = await creditScoring.LOAN_REPORTER_ROLE();
  await creditScoring.grantRole(CREDIT_ANALYST_ROLE, deployer.address);
  await creditScoring.grantRole(LOAN_REPORTER_ROLE, loanFactory.address);
  console.log("✓ CreditScoring roles configured");
  
  // Grant roles in Treasury
  const FEE_COLLECTOR_ROLE = await treasuryContract.FEE_COLLECTOR_ROLE();
  await treasuryContract.grantRole(FEE_COLLECTOR_ROLE, loanFactory.address);
  await treasuryContract.authorizeCollector(loanFactory.address);
  console.log("✓ Treasury roles configured");
  
  // Grant roles in LoanFactory
  const ADMIN_ROLE = await loanFactory.ADMIN_ROLE();
  const LOAN_APPROVER_ROLE = await loanFactory.LOAN_APPROVER_ROLE();
  await loanFactory.grantRole(ADMIN_ROLE, deployer.address);
  await loanFactory.grantRole(LOAN_APPROVER_ROLE, deployer.address);
  console.log("✓ LoanFactory roles configured");
  
  // Configure LendingPool
  const POOL_MANAGER_ROLE = await lendingPool.POOL_MANAGER_ROLE();
  await lendingPool.grantRole(POOL_MANAGER_ROLE, deployer.address);
  console.log("✓ LendingPool roles configured");
  
  // Verify contract interactions
  console.log("\n7. Verifying contract setup...");
  
  // Test UserRegistry
  try {
    const stats = await userRegistry.getPlatformStats();
    console.log("✓ UserRegistry working - Total users:", stats[0].toString());
  } catch (error) {
    console.log("✗ UserRegistry verification failed:", error.message);
  }
  
  // Test CreditScoring
  try {
    const totalAssessments = await creditScoring.totalCreditAssessments();
    console.log("✓ CreditScoring working - Total assessments:", totalAssessments.toString());
  } catch (error) {
    console.log("✗ CreditScoring verification failed:", error.message);
  }
  
  // Test Treasury
  try {
    const config = await treasuryContract.getConfiguration();
    console.log("✓ Treasury working - Fee rate:", config.operationalExpenseRate.toString());
  } catch (error) {
    console.log("✗ Treasury verification failed:", error.message);
  }
  
  // Test LoanFactory
  try {
    const factoryStats = await loanFactory.getPlatformStats();
    console.log("✓ LoanFactory working - Total loans:", factoryStats[0].toString());
  } catch (error) {
    console.log("✗ LoanFactory verification failed:", error.message);
  }
  
  // Test LendingPool
  try {
    const poolStats = await lendingPool.getPoolStats();
    console.log("✓ LendingPool working - Pool value:", poolStats[0].toString());
  } catch (error) {
    console.log("✗ LendingPool verification failed:", error.message);
  }
  
  // Create deployment summary
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      UserRegistry: userRegistry.address,
      CreditScoring: creditScoring.address,
      Treasury: treasuryContract.address,
      LoanFactory: loanFactory.address,
      LendingPool: lendingPool.address
    },
    configuration: {
      treasuryWallets: {
        operational: operational.address,
        development: development.address,
        stakeholder: stakeholder.address
      },
      platformSettings: {
        minLoanAmount: "1000000000000000000000", // $1,000
        maxLoanAmount: "50000000000000000000000", // $50,000
        platformFeeRate: "100", // 1%
        reserveFundRate: "300" // 3%
      }
    }
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("DISFRUTA PLATFORM DEPLOYMENT COMPLETED");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("- UserRegistry:", userRegistry.address);
  console.log("- CreditScoring:", creditScoring.address);
  console.log("- Treasury:", treasuryContract.address);
  console.log("- LoanFactory:", loanFactory.address);
  console.log("- LendingPool:", lendingPool.address);
  
  console.log("\nTreasury Wallets:");
  console.log("- Operational:", operational.address);
  console.log("- Development:", development.address);
  console.log("- Stakeholder:", stakeholder.address);
  
  console.log("\nNext Steps:");
  console.log("1. Update frontend configuration with contract addresses");
  console.log("2. Set up frontend environment variables");
  console.log("3. Configure wallet connections");
  console.log("4. Test user registration and loan creation flows");
  console.log("5. Set up monitoring and analytics");
  
  // Save deployment info to file
  const fs = require('fs');
  const deploymentPath = './deployment-info.json';
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentPath}`);
  
  // Return addresses for use in tests or frontend
  return {
    userRegistry: userRegistry.address,
    creditScoring: creditScoring.address,
    treasury: treasuryContract.address,
    loanFactory: loanFactory.address,
    lendingPool: lendingPool.address
  };
}

// Error handling
main()
  .then((addresses) => {
    console.log("\n✅ Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });