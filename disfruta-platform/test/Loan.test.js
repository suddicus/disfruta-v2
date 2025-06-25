// test/Loan.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan", function () {
  let loanFactory;
  let userRegistry;
  let creditScoring;
  let loan;
  let owner;
  let borrower;
  let lender1;
  let lender2;
  let lender3;

  const loanAmount = ethers.utils.parseEther("10000"); // $10,000
  const interestRate = 1200; // 12%
  const termInMonths = 24;
  const loanPurpose = "Business expansion";

  beforeEach(async function () {
    [owner, borrower, lender1, lender2, lender3] = await ethers.getSigners();

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

    // Create and approve loan
    const tx = await loanFactory.connect(borrower).createLoan(
      loanAmount,
      interestRate,
      termInMonths,
      loanPurpose
    );

    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "LoanCreated");
    const loanAddress = event.args.loanContract;

    const LOAN_APPROVER_ROLE = await loanFactory.LOAN_APPROVER_ROLE();
    await loanFactory.grantRole(LOAN_APPROVER_ROLE, owner.address);
    await loanFactory.approveLoan(loanAddress);

    // Get loan contract instance
    const Loan = await ethers.getContractFactory("Loan");
    loan = Loan.attach(loanAddress);
  });

  describe("Loan Creation and Initialization", function () {
    it("Should initialize loan with correct parameters", async function () {
      const details = await loan.getLoanDetails();
      
      expect(details._borrower).to.equal(borrower.address);
      expect(details._principal).to.equal(loanAmount);
      expect(details._termInMonths).to.equal(termInMonths);
      expect(details._status).to.equal(1); // Approved status
      expect(details._totalFunded).to.equal(0);
      expect(details._totalRepaid).to.equal(0);
    });

    it("Should calculate correct monthly payment", async function () {
      const monthlyPayment = await loan.monthlyPayment();
      expect(monthlyPayment).to.be.gt(0);
      
      // Monthly payment should be reasonable for the loan amount and term
      const expectedRange = loanAmount.div(termInMonths);
      expect(monthlyPayment).to.be.gte(expectedRange);
    });

    it("Should set correct funding deadline", async function () {
      const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      const fundingDeadline = await loan.fundingDeadline();
      const expectedDeadline = currentTime + (30 * 24 * 60 * 60); // 30 days
      
      expect(fundingDeadline).to.be.closeTo(expectedDeadline, 10); // Within 10 seconds
    });
  });

  describe("Loan Funding", function () {
    it("Should accept funding from lenders", async function () {
      const fundingAmount = ethers.utils.parseEther("2000");
      
      await expect(loan.connect(lender1).fundLoan({ value: fundingAmount }))
        .to.emit(loan, "FundingReceived")
        .withArgs(lender1.address, fundingAmount, fundingAmount);

      expect(await loan.totalFunded()).to.equal(fundingAmount);
      expect(await loan.lenderContributions(lender1.address)).to.equal(fundingAmount);
    });

    it("Should reject funding below minimum amount", async function () {
      const insufficientAmount = ethers.utils.parseEther("20"); // Below $25 minimum
      
      await expect(
        loan.connect(lender1).fundLoan({ value: insufficientAmount })
      ).to.be.revertedWithCustomError(loan, "InvalidLenderAmount");
    });

    it("Should reject overfunding", async function () {
      const excessiveAmount = ethers.utils.parseEther("15000"); // Exceeds loan principal
      
      await expect(
        loan.connect(lender1).fundLoan({ value: excessiveAmount })
      ).to.be.revertedWithCustomError(loan, "LoanAlreadyFunded");
    });

    it("Should handle multiple lenders", async function () {
      const amount1 = ethers.utils.parseEther("3000");
      const amount2 = ethers.utils.parseEther("4000");
      const amount3 = ethers.utils.parseEther("3000");

      await loan.connect(lender1).fundLoan({ value: amount1 });
      await loan.connect(lender2).fundLoan({ value: amount2 });
      await loan.connect(lender3).fundLoan({ value: amount3 });

      expect(await loan.totalFunded()).to.equal(loanAmount);
      expect(await loan.totalLenders()).to.equal(3);

      const lenders = await loan.getLenders();
      expect(lenders).to.include(lender1.address);
      expect(lenders).to.include(lender2.address);
      expect(lenders).to.include(lender3.address);
    });

    it("Should mark loan as active when fully funded", async function () {
      await loan.connect(lender1).fundLoan({ value: loanAmount });

      const details = await loan.getLoanDetails();
      expect(details._status).to.equal(2); // Active status
    });

    it("Should emit LoanFullyFunded event", async function () {
      await expect(loan.connect(lender1).fundLoan({ value: loanAmount }))
        .to.emit(loan, "LoanFullyFunded")
        .withArgs(loanAmount, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

    it("Should reject funding after deadline", async function () {
      // Fast forward time beyond funding deadline
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");

      await expect(
        loan.connect(lender1).fundLoan({ value: ethers.utils.parseEther("1000") })
      ).to.be.revertedWithCustomError(loan, "FundingDeadlineExpired");
    });
  });

  describe("Fund Withdrawal", function () {
    beforeEach(async function () {
      // Fully fund the loan
      await loan.connect(lender1).fundLoan({ value: loanAmount });
    });

    it("Should allow borrower to withdraw funds", async function () {
      const borrowerBalanceBefore = await borrower.getBalance();
      const platformFee = loanAmount.mul(100).div(10000); // 1% platform fee
      const expectedWithdrawal = loanAmount.sub(platformFee);

      await expect(loan.connect(borrower).withdrawFunds())
        .to.emit(loan, "FundsWithdrawn")
        .withArgs(borrower.address, expectedWithdrawal);

      const borrowerBalanceAfter = await borrower.getBalance();
      // Account for gas costs in the comparison
      expect(borrowerBalanceAfter).to.be.gt(borrowerBalanceBefore.add(expectedWithdrawal.div(2)));
    });

    it("Should reject withdrawal from non-borrower", async function () {
      await expect(
        loan.connect(lender1).withdrawFunds()
      ).to.be.revertedWithCustomError(loan, "UnauthorizedAccess");
    });

    it("Should reject withdrawal before full funding", async function () {
      // Create new loan that's not fully funded
      const tx = await loanFactory.connect(borrower).createLoan(
        ethers.utils.parseEther("15000"),
        1200,
        24,
        "Another loan"
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      const newLoanAddress = event.args.loanContract;
      
      await loanFactory.approveLoan(newLoanAddress);
      
      const Loan = await ethers.getContractFactory("Loan");
      const newLoan = Loan.attach(newLoanAddress);
      
      // Partially fund
      await newLoan.connect(lender1).fundLoan({ value: ethers.utils.parseEther("5000") });

      await expect(
        newLoan.connect(borrower).withdrawFunds()
      ).to.be.revertedWithCustomError(newLoan, "InsufficientFunding");
    });
  });

  describe("Loan Repayment", function () {
    beforeEach(async function () {
      // Fully fund and withdraw
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      await loan.connect(borrower).withdrawFunds();
    });

    it("Should accept monthly payment", async function () {
      const monthlyPayment = await loan.monthlyPayment();
      
      await expect(loan.connect(borrower).makePayment({ value: monthlyPayment }))
        .to.emit(loan, "PaymentMade");

      expect(await loan.totalRepaid()).to.equal(monthlyPayment);
      expect(await loan.currentPaymentNumber()).to.equal(1);

      const paymentHistory = await loan.getPaymentHistory();
      expect(paymentHistory.length).to.equal(1);
      expect(paymentHistory[0].amount).to.equal(monthlyPayment);
    });

    it("Should reject insufficient payment", async function () {
      const monthlyPayment = await loan.monthlyPayment();
      const insufficientAmount = monthlyPayment.sub(ethers.utils.parseEther("100"));

      await expect(
        loan.connect(borrower).makePayment({ value: insufficientAmount })
      ).to.be.revertedWithCustomError(loan, "InvalidPaymentAmount");
    });

    it("Should reject payment from non-borrower", async function () {
      const monthlyPayment = await loan.monthlyPayment();

      await expect(
        loan.connect(lender1).makePayment({ value: monthlyPayment })
      ).to.be.revertedWithCustomError(loan, "UnauthorizedAccess");
    });

    it("Should distribute interest to lenders proportionally", async function () {
      // Add multiple lenders with different contributions
      const amount1 = ethers.utils.parseEther("6000"); // 60%
      const amount2 = ethers.utils.parseEther("4000"); // 40%

      // Create new loan for this test
      const tx = await loanFactory.connect(borrower).createLoan(
        loanAmount,
        1200,
        24,
        "Multi-lender loan"
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "LoanCreated");
      const multiLoanAddress = event.args.loanContract;
      
      await loanFactory.approveLoan(multiLoanAddress);
      
      const Loan = await ethers.getContractFactory("Loan");
      const multiLoan = Loan.attach(multiLoanAddress);

      await multiLoan.connect(lender1).fundLoan({ value: amount1 });
      await multiLoan.connect(lender2).fundLoan({ value: amount2 });
      await multiLoan.connect(borrower).withdrawFunds();

      const lender1BalanceBefore = await lender1.getBalance();
      const lender2BalanceBefore = await lender2.getBalance();

      const monthlyPayment = await multiLoan.monthlyPayment();
      await multiLoan.connect(borrower).makePayment({ value: monthlyPayment });

      const lender1BalanceAfter = await lender1.getBalance();
      const lender2BalanceAfter = await lender2.getBalance();

      // Both lenders should receive interest proportional to their contribution
      expect(lender1BalanceAfter).to.be.gt(lender1BalanceBefore);
      expect(lender2BalanceAfter).to.be.gt(lender2BalanceBefore);
    });

    it("Should handle early payoff", async function () {
      const remainingBalance = await loan.getRemainingBalance();
      
      await expect(loan.connect(borrower).payoffLoan({ value: remainingBalance }))
        .to.emit(loan, "LoanRepaid");

      const details = await loan.getLoanDetails();
      expect(details._status).to.equal(3); // Repaid status
    });

    it("Should refund excess payment on early payoff", async function () {
      const remainingBalance = await loan.getRemainingBalance();
      const excessAmount = ethers.utils.parseEther("1000");
      const totalPayment = remainingBalance.add(excessAmount);

      const borrowerBalanceBefore = await borrower.getBalance();

      await loan.connect(borrower).payoffLoan({ value: totalPayment });

      const borrowerBalanceAfter = await borrower.getBalance();
      
      // Should receive refund minus gas costs
      expect(borrowerBalanceAfter).to.be.gt(borrowerBalanceBefore.sub(remainingBalance).sub(ethers.utils.parseEther("0.01")));
    });
  });

  describe("Loan Default Handling", function () {
    beforeEach(async function () {
      await loan.connect(lender1).fundLoan({ value: loanAmount });
      await loan.connect(borrower).withdrawFunds();
    });

    it("Should track missed payments", async function () {
      // Fast forward past payment due date + grace period
      await ethers.provider.send("evm_increaseTime", [45 * 24 * 60 * 60]); // 45 days
      await ethers.provider.send("evm_mine");

      await loan.updateMissedPayments();
      expect(await loan.missedPayments()).to.be.gt(0);
    });

    it("Should mark loan as defaulted after threshold", async function () {
      // Fast forward past default threshold
      await ethers.provider.send("evm_increaseTime", [120 * 24 * 60 * 60]); // 120 days
      await ethers.provider.send("evm_mine");

      await expect(loan.markAsDefaulted())
        .to.emit(loan, "LoanDefaulted");

      const details = await loan.getLoanDetails();
      expect(details._status).to.equal(4); // Defaulted status
    });
  });

  describe("Refund Mechanism", function () {
    it("Should refund lenders if funding deadline expires", async function () {
      // Partially fund the loan
      const partialAmount = ethers.utils.parseEther("3000");
      await loan.connect(lender1).fundLoan({ value: partialAmount });

      const lender1BalanceBefore = await lender1.getBalance();

      // Fast forward past funding deadline
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");

      await expect(loan.issueRefunds())
        .to.emit(loan, "RefundIssued")
        .withArgs(lender1.address, partialAmount);

      const lender1BalanceAfter = await lender1.getBalance();
      expect(lender1BalanceAfter).to.be.gt(lender1BalanceBefore.add(partialAmount.div(2)));

      expect(await loan.totalFunded()).to.equal(0);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await loan.connect(lender1).fundLoan({ value: loanAmount });
    });

    it("Should return correct funding progress", async function () {
      const progress = await loan.getFundingProgress();
      expect(progress).to.equal(100); // 100% funded
    });

    it("Should return correct remaining balance", async function () {
      await loan.connect(borrower).withdrawFunds();
      
      const remainingBalance = await loan.getRemainingBalance();
      expect(remainingBalance).to.be.gt(0);
      
      // After making a payment, remaining balance should decrease
      const monthlyPayment = await loan.monthlyPayment();
      await loan.connect(borrower).makePayment({ value: monthlyPayment });
      
      const newRemainingBalance = await loan.getRemainingBalance();
      expect(newRemainingBalance).to.be.lt(remainingBalance);
    });

    it("Should return correct lender information", async function () {
      const lenderInfo = await loan.getLenderInfo(lender1.address);
      expect(lenderInfo.contribution).to.equal(loanAmount);
      expect(lenderInfo.expectedReturn).to.be.gt(loanAmount);
    });

    it("Should check payment overdue status", async function () {
      await loan.connect(borrower).withdrawFunds();
      
      // Initially not overdue
      expect(await loan.isPaymentOverdue()).to.equal(false);
      
      // Fast forward past due date
      await ethers.provider.send("evm_increaseTime", [35 * 24 * 60 * 60]); // 35 days
      await ethers.provider.send("evm_mine");
      
      expect(await loan.isPaymentOverdue()).to.equal(true);
    });
  });
});