// test/LoanFactory.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LoanFactory", function () {
  let loanFactory;
  let userRegistry;
  let creditScoring;
  let treasury;
  let owner;
  let borrower;
  let lender;
  let approver;

  beforeEach(async function () {
    [owner, borrower, lender, approver] = await ethers.getSigners();

    // Deploy UserRegistry
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.deployed();

    // Deploy CreditScoring
    const CreditScoring = await ethers.getContractFactory("CreditScoring");
    creditScoring = await CreditScoring.deploy();
    await creditScoring.deployed();

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(owner.address, owner.address, owner.address);
    await treasury.deployed();

    // Deploy LoanFactory
    const LoanFactory = await ethers.getContractFactory("LoanFactory");
    loanFactory = await LoanFactory.deploy(userRegistry.address, creditScoring.address);
    await loanFactory.deployed();

    // Setup borrower
    await userRegistry.connect(borrower).registerUser(
      "borrower@test.com",
      "+1234567890",
      "John",
      "Doe",
      "US"
    );

    // Create credit profile for borrower
    const KYC_VERIFIER_ROLE = await userRegistry.KYC_VERIFIER_ROLE();
    await userRegistry.grantRole(KYC_VERIFIER_ROLE, owner.address);
    
    const COMPLIANCE_OFFICER_ROLE = await userRegistry.COMPLIANCE_OFFICER_ROLE();
    await userRegistry.grantRole(COMPLIANCE_OFFICER_ROLE, owner.address);

    const CREDIT_ANALYST_ROLE = await creditScoring.CREDIT_ANALYST_ROLE();
    await creditScoring.grantRole(CREDIT_ANALYST_ROLE, owner.address);

    // Upload and verify KYC document
    await userRegistry.connect(borrower).uploadKYCDocument(
      "passport",
      "QmTestHash123",
      "P123456789"
    );

    await userRegistry.verifyKYCDocument(borrower.address, 0, true, "Verified");

    // Perform compliance check
    await userRegistry.performComplianceCheck(
      borrower.address,
      true, // AML passed
      true, // Sanctions passed
      true, // PEP passed
      50,   // Risk score
      "All checks passed"
    );

    // Create credit profile
    await creditScoring.createCreditProfile(
      borrower.address,
      [5000, 24, 1000, 36, 0, 2] // [income, employment_months, existing_debt, payment_history_months, previous_defaults, credit_inquiries]
    );

    // Grant loan approver role
    const LOAN_APPROVER_ROLE = await loanFactory.LOAN_APPROVER_ROLE();
    await loanFactory.grantRole(LOAN_APPROVER_ROLE, approver.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const DEFAULT_ADMIN_ROLE = await loanFactory.DEFAULT_ADMIN_ROLE();
      expect(await loanFactory.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
    });

    it("Should set correct user registry and credit scoring addresses", async function () {
      expect(await loanFactory.userRegistry()).to.equal(userRegistry.address);
      expect(await loanFactory.creditScoring()).to.equal(creditScoring.address);
    });

    it("Should initialize with zero loans", async function () {
      const stats = await loanFactory.getPlatformStats();
      expect(stats[0]).to.equal(0); // totalLoansCreated
      expect(stats[1]).to.equal(0); // totalActiveLoans
    });
  });

  describe("Loan Creation", function () {
    it("Should create a loan with valid parameters", async function () {
      const loanAmount = ethers.utils.parseEther("5000");
      const interestRate = 1200; // 12%
      const term = 24; // 24 months
      const purpose = "Business expansion";

      const tx = await loanFactory.connect(borrower).createLoan(
        loanAmount,
        interestRate,
        term,
        purpose
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      
      expect(event).to.not.be.undefined;
      expect(event.args.borrower).to.equal(borrower.address);
      expect(event.args.amount).to.equal(loanAmount);
      expect(event.args.purpose).to.equal(purpose);

      const stats = await loanFactory.getPlatformStats();
      expect(stats[0]).to.equal(1); // totalLoansCreated
    });

    it("Should reject loan creation with invalid amount", async function () {
      const invalidAmount = ethers.utils.parseEther("500"); // Below minimum
      
      await expect(
        loanFactory.connect(borrower).createLoan(
          invalidAmount,
          1200,
          24,
          "Test purpose"
        )
      ).to.be.revertedWithCustomError(loanFactory, "InvalidLoanAmount");
    });

    it("Should reject loan creation with excessive interest rate", async function () {
      const loanAmount = ethers.utils.parseEther("5000");
      const excessiveRate = 3500; // 35% exceeds maximum
      
      await expect(
        loanFactory.connect(borrower).createLoan(
          loanAmount,
          excessiveRate,
          24,
          "Test purpose"
        )
      ).to.be.revertedWithCustomError(loanFactory, "InvalidInterestRate");
    });

    it("Should reject loan creation with invalid term", async function () {
      const loanAmount = ethers.utils.parseEther("5000");
      const invalidTerm = 6; // Below minimum 12 months
      
      await expect(
        loanFactory.connect(borrower).createLoan(
          loanAmount,
          1200,
          invalidTerm,
          "Test purpose"
        )
      ).to.be.revertedWithCustomError(loanFactory, "InvalidLoanTerm");
    });

    it("Should reject loan creation from unverified borrower", async function () {
      const loanAmount = ethers.utils.parseEther("5000");
      
      await expect(
        loanFactory.connect(lender).createLoan(
          loanAmount,
          1200,
          24,
          "Test purpose"
        )
      ).to.be.revertedWithCustomError(loanFactory, "BorrowerNotVerified");
    });

    it("Should adjust interest rate based on credit score", async function () {
      const loanAmount = ethers.utils.parseEther("5000");
      const baseRate = 1200; // 12%
      
      const tx = await loanFactory.connect(borrower).createLoan(
        loanAmount,
        baseRate,
        24,
        "Test loan"
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      
      // Rate should be adjusted based on credit score
      // The exact adjustment depends on the credit score calculated
      expect(event.args.interestRate).to.be.gte(baseRate);
    });
  });

  describe("Loan Approval", function () {
    let loanAddress;

    beforeEach(async function () {
      const tx = await loanFactory.connect(borrower).createLoan(
        ethers.utils.parseEther("5000"),
        1200,
        24,
        "Test loan"
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      loanAddress = event.args.loanContract;
    });

    it("Should approve a loan", async function () {
      await expect(loanFactory.connect(approver).approveLoan(loanAddress))
        .to.emit(loanFactory, "LoanApproved")
        .withArgs(loanAddress, approver.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

      expect(await loanFactory.isLoanApproved(loanAddress)).to.equal(true);
      
      const stats = await loanFactory.getPlatformStats();
      expect(stats[1]).to.equal(1); // totalActiveLoans
    });

    it("Should reject approval from unauthorized account", async function () {
      await expect(
        loanFactory.connect(borrower).approveLoan(loanAddress)
      ).to.be.reverted;
    });

    it("Should reject double approval", async function () {
      await loanFactory.connect(approver).approveLoan(loanAddress);
      
      await expect(
        loanFactory.connect(approver).approveLoan(loanAddress)
      ).to.be.revertedWithCustomError(loanFactory, "LoanAlreadyApproved");
    });
  });

  describe("Borrower Loans Tracking", function () {
    it("Should track loans for borrower", async function () {
      // Create first loan
      await loanFactory.connect(borrower).createLoan(
        ethers.utils.parseEther("3000"),
        1000,
        12,
        "First loan"
      );

      // Create second loan
      await loanFactory.connect(borrower).createLoan(
        ethers.utils.parseEther("7000"),
        1500,
        36,
        "Second loan"
      );

      const borrowerLoans = await loanFactory.getBorrowerLoans(borrower.address);
      expect(borrowerLoans.length).to.equal(2);

      const allLoans = await loanFactory.getAllLoans();
      expect(allLoans.length).to.equal(2);
    });
  });

  describe("Platform Configuration", function () {
    it("Should update platform fee rate", async function () {
      const newFeeRate = 150; // 1.5%
      
      await expect(loanFactory.updatePlatformFeeRate(newFeeRate))
        .to.emit(loanFactory, "PlatformFeeUpdated")
        .withArgs(100, newFeeRate); // old rate was 100 (1%)

      expect(await loanFactory.platformFeeRate()).to.equal(newFeeRate);
    });

    it("Should reject excessive fee rate", async function () {
      const excessiveFeeRate = 600; // 6% exceeds maximum 5%
      
      await expect(
        loanFactory.updatePlatformFeeRate(excessiveFeeRate)
      ).to.be.revertedWith("Fee rate cannot exceed 5%");
    });

    it("Should update reserve fund rate", async function () {
      const newReserveRate = 400; // 4%
      
      await expect(loanFactory.updateReserveFundRate(newReserveRate))
        .to.emit(loanFactory, "ReserveFundRateUpdated")
        .withArgs(300, newReserveRate); // old rate was 300 (3%)

      expect(await loanFactory.reserveFundRate()).to.equal(newReserveRate);
    });

    it("Should reject unauthorized configuration updates", async function () {
      await expect(
        loanFactory.connect(borrower).updatePlatformFeeRate(200)
      ).to.be.reverted;
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and unpause contract", async function () {
      await loanFactory.pause();
      expect(await loanFactory.paused()).to.equal(true);

      // Should reject loan creation when paused
      await expect(
        loanFactory.connect(borrower).createLoan(
          ethers.utils.parseEther("5000"),
          1200,
          24,
          "Test loan"
        )
      ).to.be.revertedWith("Pausable: paused");

      await loanFactory.unpause();
      expect(await loanFactory.paused()).to.equal(false);
    });

    it("Should reject pause from unauthorized account", async function () {
      await expect(
        loanFactory.connect(borrower).pause()
      ).to.be.reverted;
    });
  });

  describe("Integration with Credit Scoring", function () {
    it("Should use credit score for rate adjustment", async function () {
      // Create a borrower with excellent credit
      await userRegistry.connect(lender).registerUser(
        "excellent@test.com",
        "+1987654321",
        "Jane",
        "Smith",
        "US"
      );

      await userRegistry.connect(lender).uploadKYCDocument(
        "passport",
        "QmExcellentHash",
        "P987654321"
      );

      await userRegistry.verifyKYCDocument(lender.address, 0, true, "Verified");
      await userRegistry.performComplianceCheck(lender.address, true, true, true, 30, "Excellent profile");

      // Create credit profile with excellent score
      await creditScoring.createCreditProfile(
        lender.address,
        [10000, 60, 500, 120, 0, 1] // High income, long employment, low debt, long history, no defaults, few inquiries
      );

      const baseRate = 1200;
      const tx = await loanFactory.connect(lender).createLoan(
        ethers.utils.parseEther("5000"),
        baseRate,
        24,
        "Excellent credit loan"
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      
      // Should get better rate due to excellent credit
      expect(event.args.interestRate).to.be.lt(baseRate);
    });
  });
});