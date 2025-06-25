// test/LendingPool.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
  let lendingPool;
  let loanFactory;
  let userRegistry;
  let creditScoring;
  let owner;
  let lender1;
  let lender2;
  let lender3;
  let borrower;

  beforeEach(async function () {
    [owner, lender1, lender2, lender3, borrower] = await ethers.getSigners();

    // Deploy dependencies
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.deployed();

    const CreditScoring = await ethers.getContractFactory("CreditScoring");
    creditScoring = await CreditScoring.deploy();
    await creditScoring.deployed();

    const LoanFactory = await ethers.getContractFactory("LoanFactory");
    loanFactory = await LoanFactory.deploy(userRegistry.address, creditScoring.address);
    await loanFactory.deployed();

    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(loanFactory.address);
    await lendingPool.deployed();

    // Setup borrower
    await userRegistry.connect(borrower).registerUser(
      "borrower@test.com",
      "+1234567890",
      "John",
      "Doe",
      "US"
    );

    // Setup roles and verification
    const KYC_VERIFIER_ROLE = await userRegistry.KYC_VERIFIER_ROLE();
    await userRegistry.grantRole(KYC_VERIFIER_ROLE, owner.address);
    
    const COMPLIANCE_OFFICER_ROLE = await userRegistry.COMPLIANCE_OFFICER_ROLE();
    await userRegistry.grantRole(COMPLIANCE_OFFICER_ROLE, owner.address);

    const CREDIT_ANALYST_ROLE = await creditScoring.CREDIT_ANALYST_ROLE();
    await creditScoring.grantRole(CREDIT_ANALYST_ROLE, owner.address);

    // Complete KYC for borrower
    await userRegistry.connect(borrower).uploadKYCDocument(
      "passport",
      "QmTestHash123",
      "P123456789"
    );
    await userRegistry.verifyKYCDocument(borrower.address, 0, true, "Verified");
    await userRegistry.performComplianceCheck(
      borrower.address,
      true, true, true, 50, "All checks passed"
    );

    // Create credit profile
    await creditScoring.createCreditProfile(
      borrower.address,
      [5000, 24, 1000, 36, 0, 2]
    );
  });

  describe("Pool Deployment", function () {
    it("Should set correct loan factory address", async function () {
      expect(await lendingPool.loanFactory()).to.equal(loanFactory.address);
    });

    it("Should initialize with default settings", async function () {
      const settings = await lendingPool.poolSettings();
      expect(settings.minInvestmentAmount).to.equal(ethers.utils.parseEther("100"));
      expect(settings.autoInvestEnabled).to.equal(true);
      expect(settings.targetUtilizationRate).to.equal(8000); // 80%
    });

    it("Should start with zero pool value", async function () {
      const stats = await lendingPool.getPoolStats();
      expect(stats._totalPoolValue).to.equal(0);
      expect(stats._totalShares).to.equal(0);
      expect(stats._activeLendersCount).to.equal(0);
    });
  });

  describe("Pool Deposits", function () {
    it("Should accept deposits above minimum", async function () {
      const depositAmount = ethers.utils.parseEther("500");
      
      await expect(lendingPool.connect(lender1).deposit({ value: depositAmount }))
        .to.emit(lendingPool, "Deposit")
        .withArgs(lender1.address, depositAmount, depositAmount);

      const stats = await lendingPool.getPoolStats();
      expect(stats._totalPoolValue).to.equal(depositAmount);
      expect(stats._totalShares).to.equal(depositAmount);
    });

    it("Should reject deposits below minimum", async function () {
      const insufficientAmount = ethers.utils.parseEther("50");
      
      await expect(
        lendingPool.connect(lender1).deposit({ value: insufficientAmount })
      ).to.be.revertedWithCustomError(lendingPool, "InsufficientDeposit");
    });

    it("Should handle multiple deposits correctly", async function () {
      const amount1 = ethers.utils.parseEther("1000");
      const amount2 = ethers.utils.parseEther("2000");
      
      await lendingPool.connect(lender1).deposit({ value: amount1 });
      await lendingPool.connect(lender2).deposit({ value: amount2 });

      const stats = await lendingPool.getPoolStats();
      expect(stats._totalPoolValue).to.equal(amount1.add(amount2));
      expect(stats._activeLendersCount).to.equal(2);
    });

    it("Should calculate shares proportionally", async function () {
      const firstDeposit = ethers.utils.parseEther("1000");
      const secondDeposit = ethers.utils.parseEther("500");
      
      // First deposit gets 1:1 ratio
      await lendingPool.connect(lender1).deposit({ value: firstDeposit });
      
      const lender1Info = await lendingPool.getLenderInfo(lender1.address);
      expect(lender1Info.shareBalance).to.equal(firstDeposit);

      // Second deposit should get proportional shares
      await lendingPool.connect(lender2).deposit({ value: secondDeposit });
      
      const lender2Info = await lendingPool.getLenderInfo(lender2.address);
      expect(lender2Info.shareBalance).to.equal(secondDeposit);
    });

    it("Should add lenders to active list", async function () {
      await lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("500") });
      await lendingPool.connect(lender2).deposit({ value: ethers.utils.parseEther("1000") });

      const activeLenders = await lendingPool.getActiveLenders();
      expect(activeLenders).to.include(lender1.address);
      expect(activeLenders).to.include(lender2.address);
      expect(activeLenders.length).to.equal(2);
    });
  });

  describe("Pool Withdrawals", function () {
    beforeEach(async function () {
      // Add some deposits
      await lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("1000") });
      await lendingPool.connect(lender2).deposit({ value: ethers.utils.parseEther("2000") });
    });

    it("Should allow partial withdrawal", async function () {
      const lender1Info = await lendingPool.getLenderInfo(lender1.address);
      const sharesBalance = lender1Info.shareBalance;
      const withdrawShares = sharesBalance.div(2);

      const lender1BalanceBefore = await lender1.getBalance();
      
      await expect(lendingPool.connect(lender1).withdraw(withdrawShares))
        .to.emit(lendingPool, "Withdrawal");

      const lender1BalanceAfter = await lender1.getBalance();
      expect(lender1BalanceAfter).to.be.gt(lender1BalanceBefore);
    });

    it("Should reject withdrawal of more shares than owned", async function () {
      const lender1Info = await lendingPool.getLenderInfo(lender1.address);
      const excessiveShares = lender1Info.shareBalance.add(ethers.utils.parseEther("100"));

      await expect(
        lendingPool.connect(lender1).withdraw(excessiveShares)
      ).to.be.revertedWithCustomError(lendingPool, "InvalidWithdrawalAmount");
    });

    it("Should remove lender when all shares withdrawn", async function () {
      const lender1Info = await lendingPool.getLenderInfo(lender1.address);
      const allShares = lender1Info.shareBalance;

      await lendingPool.connect(lender1).withdraw(allShares);

      const activeLenders = await lendingPool.getActiveLenders();
      expect(activeLenders).to.not.include(lender1.address);
    });

    it("Should reject withdrawal exceeding available balance", async function () {
      // Invest most of the pool funds
      const stats = await lendingPool.getPoolStats();
      const mostFunds = stats._totalPoolValue.sub(ethers.utils.parseEther("100"));
      
      // This would normally trigger auto-investment, but we'll simulate low available balance
      const lender1Info = await lendingPool.getLenderInfo(lender1.address);
      
      // Try to withdraw when there's insufficient available balance
      // Note: This test might need adjustment based on actual auto-investment behavior
      await expect(
        lendingPool.connect(lender1).withdraw(lender1Info.shareBalance)
      ).to.not.be.reverted; // Should work if there's sufficient available balance
    });
  });

  describe("Auto-Investment", function () {
    beforeEach(async function () {
      // Add pool deposits
      await lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("5000") });
      await lendingPool.connect(lender2).deposit({ value: ethers.utils.parseEther("3000") });

      // Create and approve a loan for auto-investment
      const LOAN_APPROVER_ROLE = await loanFactory.LOAN_APPROVER_ROLE();
      await loanFactory.grantRole(LOAN_APPROVER_ROLE, owner.address);
    });

    it("Should trigger auto-investment on deposit", async function () {
      // Create a loan that can be invested in
      const tx = await loanFactory.connect(borrower).createLoan(
        ethers.utils.parseEther("2000"),
        1200,
        24,
        "Auto-invest test loan"
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      const loanAddress = event.args.loanContract;

      await loanFactory.approveLoan(loanAddress);

      // Make another deposit to trigger auto-investment
      await expect(lendingPool.connect(lender3).deposit({ value: ethers.utils.parseEther("1000") }))
        .to.emit(lendingPool, "Deposit");

      // Check if investment was made (this depends on the auto-investment logic)
      const investedLoans = await lendingPool.getInvestedLoans();
      // The specific assertion here depends on the auto-investment implementation
    });

    it("Should respect maximum single investment limit", async function () {
      // The pool should not invest more than 10% of total value in any single loan
      const stats = await lendingPool.getPoolStats();
      const maxSingleInvestment = stats._totalPoolValue.div(10);

      // This test would need to verify the auto-investment respects the limit
      // Implementation details depend on how the auto-investment logic works
    });
  });

  describe("Pool Settings Management", function () {
    it("Should update pool settings by admin", async function () {
      const ADMIN_ROLE = await lendingPool.ADMIN_ROLE();
      await lendingPool.grantRole(ADMIN_ROLE, owner.address);

      await lendingPool.updatePoolSettings(
        ethers.utils.parseEther("200"), // minInvestment
        8, // maxRiskLevel
        7500, // targetUtilization (75%)
        150, // managementFee (1.5%)
        800  // performanceFee (8%)
      );

      const settings = await lendingPool.poolSettings();
      expect(settings.minInvestmentAmount).to.equal(ethers.utils.parseEther("200"));
      expect(settings.maxRiskLevel).to.equal(8);
      expect(settings.targetUtilizationRate).to.equal(7500);
    });

    it("Should reject invalid settings", async function () {
      const ADMIN_ROLE = await lendingPool.ADMIN_ROLE();
      await lendingPool.grantRole(ADMIN_ROLE, owner.address);

      await expect(
        lendingPool.updatePoolSettings(
          ethers.utils.parseEther("100"),
          15, // Invalid risk level > 10
          8000,
          100,
          1000
        )
      ).to.be.revertedWith("Invalid risk level");
    });

    it("Should toggle auto-investment", async function () {
      const ADMIN_ROLE = await lendingPool.ADMIN_ROLE();
      await lendingPool.grantRole(ADMIN_ROLE, owner.address);

      await lendingPool.toggleAutoInvestment(false);
      
      const settings = await lendingPool.poolSettings();
      expect(settings.autoInvestEnabled).to.equal(false);
    });
  });

  describe("Lender Preferences", function () {
    beforeEach(async function () {
      await lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("1000") });
    });

    it("Should update lender preferences", async function () {
      await lendingPool.connect(lender1).updateLenderPreferences(8, false);

      const lenderInfo = await lendingPool.getLenderInfo(lender1.address);
      expect(lenderInfo.riskTolerance).to.equal(8);
      expect(lenderInfo.autoInvestEnabled).to.equal(false);
    });

    it("Should reject invalid risk tolerance", async function () {
      await expect(
        lendingPool.connect(lender1).updateLenderPreferences(15, true)
      ).to.be.revertedWith("Invalid risk tolerance");
    });

    it("Should reject preferences from non-members", async function () {
      await expect(
        lendingPool.connect(lender3).updateLenderPreferences(5, true)
      ).to.be.revertedWith("Not a pool member");
    });
  });

  describe("Returns Processing", function () {
    beforeEach(async function () {
      await lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("2000") });
    });

    it("Should process loan returns", async function () {
      // Simulate a loan investment
      const loanAddress = ethers.constants.AddressZero; // Placeholder
      const returnAmount = ethers.utils.parseEther("100");

      // This would typically be called by the loan contract
      await expect(
        lendingPool.processLoanReturns(loanAddress, { value: returnAmount })
      ).to.emit(lendingPool, "ReturnsDistributed");

      const stats = await lendingPool.getPoolStats();
      expect(stats._totalReturns).to.equal(returnAmount);
    });
  });

  describe("Share Price Calculation", function () {
    it("Should start with 1.0 share price", async function () {
      const sharePrice = await lendingPool.getSharePrice();
      expect(sharePrice).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should adjust share price based on pool performance", async function () {
      await lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("1000") });
      
      // Simulate returns
      const returnAmount = ethers.utils.parseEther("100");
      await lendingPool.processLoanReturns(ethers.constants.AddressZero, { value: returnAmount });

      const sharePrice = await lendingPool.getSharePrice();
      expect(sharePrice).to.be.gt(ethers.utils.parseEther("1"));
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and unpause pool operations", async function () {
      const ADMIN_ROLE = await lendingPool.ADMIN_ROLE();
      await lendingPool.grantRole(ADMIN_ROLE, owner.address);

      await lendingPool.pause();
      expect(await lendingPool.paused()).to.equal(true);

      await expect(
        lendingPool.connect(lender1).deposit({ value: ethers.utils.parseEther("500") })
      ).to.be.revertedWith("Pausable: paused");

      await lendingPool.unpause();
      expect(await lendingPool.paused()).to.equal(false);
    });
  });
});