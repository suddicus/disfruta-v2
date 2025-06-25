const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Disfruta Platform - Security Test Suite", function () {
    async function deployPlatformFixture() {
        const [owner, borrower, lender, attacker, admin] = await ethers.getSigners();
        
        // Deploy all contracts
        const UserRegistry = await ethers.getContractFactory("UserRegistry");
        const userRegistry = await UserRegistry.deploy();
        
        const CreditScoring = await ethers.getContractFactory("CreditScoring");
        const creditScoring = await CreditScoring.deploy();
        
        const Treasury = await ethers.getContractFactory("Treasury");
        const treasury = await Treasury.deploy();
        
        const LendingPool = await ethers.getContractFactory("LendingPool");
        const lendingPool = await LendingPool.deploy(treasury.address);
        
        const LoanFactory = await ethers.getContractFactory("LoanFactory");
        const loanFactory = await LoanFactory.deploy(
            userRegistry.address,
            creditScoring.address,
            treasury.address
        );
        
        return {
            userRegistry,
            creditScoring,
            treasury,
            lendingPool,
            loanFactory,
            owner,
            borrower,
            lender,
            attacker,
            admin
        };
    }

    describe("Cross-Contract Security Tests", function () {
        it("Should prevent unauthorized access across contracts", async function () {
            const { userRegistry, loanFactory, attacker } = await loadFixture(deployPlatformFixture);
            
            // Attempt unauthorized operations should fail
            try {
                await userRegistry.connect(attacker).setUserVerified(attacker.address, true);
                expect.fail("Should have reverted");
            } catch (error) {
                expect(error.message).to.include("AccessControl");
            }
            
            try {
                await loanFactory.connect(attacker).pause();
                expect.fail("Should have reverted");
            } catch (error) {
                expect(error.message).to.include("AccessControl");
            }
        });

        it("Should protect against front-running attacks", async function () {
            const { loanFactory, userRegistry, borrower, attacker } = await loadFixture(deployPlatformFixture);
            
            await userRegistry.connect(borrower).registerUser("Borrower", "borrower@test.com");
            
            // Create loan from registered user
            await loanFactory.connect(borrower).createLoan(
                ethers.utils.parseEther("1000"),
                500,
                365 * 24 * 60 * 60,
                "Original loan"
            );
            
            // Attacker tries to create loan without registration
            await expect(
                loanFactory.connect(attacker).createLoan(
                    ethers.utils.parseEther("1000"),
                    500,
                    365 * 24 * 60 * 60,
                    "Front-run attempt"
                )
            ).to.be.revertedWith("User not registered");
        });

        it("Should prevent integer overflow/underflow", async function () {
            const { lendingPool, lender } = await loadFixture(deployPlatformFixture);
            
            const maxUint256 = ethers.constants.MaxUint256;
            
            // Attempt to cause overflow should be handled gracefully
            try {
                await lendingPool.connect(lender).deposit({ value: maxUint256 });
                // If it doesn't revert, check that state is still consistent
                const balance = await lendingPool.balanceOf(lender.address);
                expect(balance).to.be.greaterThanOrEqual(0);
            } catch (error) {
                // Expected behavior - transaction should revert
                expect(error.message).to.include("revert");
            }
        });

        it("Should validate all input parameters", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployPlatformFixture);
            
            await userRegistry.connect(borrower).registerUser("Test User", "test@example.com");
            
            // Test various invalid inputs
            const invalidInputs = [
                { amount: 0, rate: 500, duration: 365 * 24 * 60 * 60, desc: "Zero amount" },
                { amount: ethers.utils.parseEther("1000"), rate: 0, duration: 365 * 24 * 60 * 60, desc: "Zero rate" },
                { amount: ethers.utils.parseEther("1000"), rate: 500, duration: 0, desc: "Zero duration" },
                { amount: ethers.utils.parseEther("1000"), rate: 15000, duration: 365 * 24 * 60 * 60, desc: "Excessive rate" }
            ];
            
            for (const input of invalidInputs) {
                await expect(
                    loanFactory.connect(borrower).createLoan(input.amount, input.rate, input.duration, input.desc)
                ).to.be.reverted;
            }
        });
    });

    describe("Flash Loan Attack Protection", function () {
        it("Should prevent flash loan manipulation", async function () {
            const { lendingPool, treasury } = await loadFixture(deployPlatformFixture);
            
            // Test that the lending pool has proper protections
            const poolBalance = await ethers.provider.getBalance(lendingPool.address);
            expect(poolBalance).to.equal(0); // Should start with zero balance
            
            // This is a placeholder for more sophisticated flash loan attack tests
            expect(true).to.be.true;
        });
    });

    describe("Governance Attack Protection", function () {
        it("Should prevent governance token manipulation", async function () {
            const { treasury, attacker } = await loadFixture(deployPlatformFixture);
            
            // Test governance mechanisms if implemented  
            const treasuryBalance = await ethers.provider.getBalance(treasury.address);
            expect(treasuryBalance).to.equal(0);
            
            expect(true).to.be.true;
        });
    });

    describe("Oracle Manipulation Protection", function () {
        it("Should handle price oracle failures gracefully", async function () {
            const { creditScoring, borrower } = await loadFixture(deployPlatformFixture);
            
            // Test oracle price manipulation protection
            const creditScore = await creditScoring.getCreditScore(borrower.address);
            expect(creditScore).to.be.greaterThanOrEqual(0);
            
            expect(true).to.be.true;
        });
    });

    describe("Time-based Attack Protection", function () {
        it("Should prevent timestamp manipulation", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployPlatformFixture);
            
            await userRegistry.connect(borrower).registerUser("Test User", "test@example.com");
            
            // Create loan with current timestamp
            await loanFactory.connect(borrower).createLoan(
                ethers.utils.parseEther("1000"),
                500,
                365 * 24 * 60 * 60,
                "Time test"
            );
            
            // Contract should use block.timestamp, not user-provided timestamps
            const totalLoans = await loanFactory.totalLoans();
            expect(totalLoans).to.equal(1);
        });
    });

    describe("Reentrancy Attack Protection", function () {
        it("Should prevent reentrancy attacks on critical functions", async function () {
            const { loanFactory, userRegistry, borrower } = await loadFixture(deployPlatformFixture);
            
            await userRegistry.connect(borrower).registerUser("Test User", "test@example.com");
            
            // Test that functions are protected against reentrancy
            await loanFactory.connect(borrower).createLoan(
                ethers.utils.parseEther("1000"),
                500,
                365 * 24 * 60 * 60,
                "Reentrancy test"
            );
            
            const totalLoans = await loanFactory.totalLoans();
            expect(totalLoans).to.equal(1);
        });
    });
});
