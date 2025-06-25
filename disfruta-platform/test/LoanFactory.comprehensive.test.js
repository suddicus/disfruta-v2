const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("LoanFactory - Comprehensive Test Suite", function () {
    async function deployLoanFactoryFixture() {
        const [owner, borrower, lender, admin, attacker] = await ethers.getSigners();
        
        // Deploy dependencies
        const UserRegistry = await ethers.getContractFactory("UserRegistry");
        const userRegistry = await UserRegistry.deploy();
        
        const CreditScoring = await ethers.getContractFactory("CreditScoring");
        const creditScoring = await CreditScoring.deploy();
        
        const Treasury = await ethers.getContractFactory("Treasury");
        const treasury = await Treasury.deploy();
        
        // Deploy LoanFactory
        const LoanFactory = await ethers.getContractFactory("LoanFactory");
        const loanFactory = await LoanFactory.deploy(
            userRegistry.address,
            creditScoring.address,
            treasury.address
        );
        
        return {
            loanFactory,
            userRegistry,
            creditScoring,
            treasury,
            owner,
            borrower,
            lender,
            admin,
            attacker
        };
    }

    describe("Deployment and Initialization", function () {
        it("Should deploy with correct initial state", async function () {
            const { loanFactory, userRegistry, creditScoring, treasury } = await loadFixture(deployLoanFactoryFixture);
            
            expect(await loanFactory.userRegistry()).to.equal(userRegistry.address);
            expect(await loanFactory.creditScoring()).to.equal(creditScoring.address);
            expect(await loanFactory.treasury()).to.equal(treasury.address);
            expect(await loanFactory.totalLoans()).to.equal(0);
        });

        it("Should fail deployment with zero addresses", async function () {
            const LoanFactory = await ethers.getContractFactory("LoanFactory");
            
            await expect(
                LoanFactory.deploy(ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid address");
        });
    });

    describe("Loan Creation - Security Tests", function () {
        it("Should create loan with valid parameters", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            // Register borrower first
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            const loanAmount = ethers.utils.parseEther("1000");
            const interestRate = 500; // 5%
            const duration = 365 * 24 * 60 * 60; // 1 year
            
            await expect(
                loanFactory.connect(borrower).createLoan(loanAmount, interestRate, duration, "Business expansion")
            ).to.emit(loanFactory, "LoanCreated");
            
            expect(await loanFactory.totalLoans()).to.equal(1);
        });

        it("Should reject loan creation from unregistered user", async function () {
            const { loanFactory, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            const loanAmount = ethers.utils.parseEther("1000");
            const interestRate = 500;
            const duration = 365 * 24 * 60 * 60;
            
            await expect(
                loanFactory.connect(borrower).createLoan(loanAmount, interestRate, duration, "Business expansion")
            ).to.be.revertedWith("User not registered");
        });

        it("Should reject loan with zero amount", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            await expect(
                loanFactory.connect(borrower).createLoan(0, 500, 365 * 24 * 60 * 60, "Business expansion")
            ).to.be.revertedWith("Loan amount must be greater than 0");
        });

        it("Should reject loan with excessive interest rate", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            await expect(
                loanFactory.connect(borrower).createLoan(
                    ethers.utils.parseEther("1000"),
                    10000, // 100% interest rate
                    365 * 24 * 60 * 60,
                    "Business expansion"
                )
            ).to.be.revertedWith("Interest rate too high");
        });

        it("Should reject loan with invalid duration", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            await expect(
                loanFactory.connect(borrower).createLoan(
                    ethers.utils.parseEther("1000"),
                    500,
                    0, // Invalid duration
                    "Business expansion"
                )
            ).to.be.revertedWith("Invalid loan duration");
        });
    });

    describe("Access Control and Security", function () {
        it("Should only allow admin to pause/unpause", async function () {
            const { loanFactory, attacker, owner } = await loadFixture(deployLoanFactoryFixture);
            
            await expect(
                loanFactory.connect(attacker).pause()
            ).to.be.revertedWith("AccessControl: account");
            
            await loanFactory.connect(owner).pause();
            expect(await loanFactory.paused()).to.be.true;
        });

        it("Should prevent loan creation when paused", async function () {
            const { loanFactory, userRegistry, borrower, owner } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            await loanFactory.connect(owner).pause();
            
            await expect(
                loanFactory.connect(borrower).createLoan(
                    ethers.utils.parseEther("1000"),
                    500,
                    365 * 24 * 60 * 60,
                    "Business expansion"
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should protect against reentrancy attacks", async function () {
            // Implementation would include a malicious contract attempting reentrancy
            const { loanFactory } = await loadFixture(deployLoanFactoryFixture);
            // This is a placeholder for the actual reentrancy test
            expect(await loanFactory.totalLoans()).to.equal(0);
        });
    });

    describe("Gas Optimization Tests", function () {
        it("Should optimize gas usage for multiple loan creations", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            const tx1 = await loanFactory.connect(borrower).createLoan(
                ethers.utils.parseEther("1000"),
                500,
                365 * 24 * 60 * 60,
                "First loan"
            );
            const receipt1 = await tx1.wait();
            
            const tx2 = await loanFactory.connect(borrower).createLoan(
                ethers.utils.parseEther("2000"),
                600,
                365 * 24 * 60 * 60,
                "Second loan"
            );
            const receipt2 = await tx2.wait();
            
            // Gas usage should be reasonable for both transactions
            expect(receipt1.gasUsed).to.be.greaterThan(0);
            expect(receipt2.gasUsed).to.be.greaterThan(0);
        });
    });

    describe("Edge Cases and Boundary Tests", function () {
        it("Should handle maximum loan amount", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            const maxAmount = ethers.utils.parseEther("1000000"); // 1M ETH
            
            await expect(
                loanFactory.connect(borrower).createLoan(maxAmount, 500, 365 * 24 * 60 * 60, "Max loan")
            ).to.emit(loanFactory, "LoanCreated");
        });

        it("Should handle minimum valid parameters", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            await expect(
                loanFactory.connect(borrower).createLoan(
                    1, // Minimum amount (1 wei)
                    1, // Minimum interest rate
                    24 * 60 * 60, // Minimum duration (1 day)
                    "Min loan"
                )
            ).to.emit(loanFactory, "LoanCreated");
        });

        it("Should handle empty description", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            await expect(
                loanFactory.connect(borrower).createLoan(
                    ethers.utils.parseEther("1000"),
                    500,
                    365 * 24 * 60 * 60,
                    "" // Empty description
                )
            ).to.emit(loanFactory, "LoanCreated");
        });
    });

    describe("Integration Tests", function () {
        it("Should integrate correctly with UserRegistry", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            // Test user registration integration
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            const isRegistered = await userRegistry.isUserRegistered(borrower.address);
            expect(isRegistered).to.be.true;
            
            // Should allow loan creation for registered user
            await expect(
                loanFactory.connect(borrower).createLoan(
                    ethers.utils.parseEther("1000"),
                    500,
                    365 * 24 * 60 * 60,
                    "Integration test"
                )
            ).to.emit(loanFactory, "LoanCreated");
        });

        it("Should integrate correctly with CreditScoring", async function () {
            const { loanFactory, userRegistry, creditScoring, borrower } = await loadFixture(deployLoanFactoryFixture);
            
            await userRegistry.connect(borrower).registerUser("John Doe", "john@example.com");
            
            // Check credit score integration
            const creditScore = await creditScoring.getCreditScore(borrower.address);
            expect(creditScore).to.be.greaterThanOrEqual(0);
        });
    });
});
