const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Loan Contract - Comprehensive Test Suite", function () {
    async function deployLoanFixture() {
        const [owner, borrower, lender, admin] = await ethers.getSigners();
        
        const loanAmount = ethers.utils.parseEther("1000");
        const interestRate = 500; // 5%
        const duration = 365 * 24 * 60 * 60; // 1 year
        
        const Loan = await ethers.getContractFactory("Loan");
        const loan = await Loan.deploy(
            borrower.address,
            loanAmount,
            interestRate,
            duration,
            "Test loan description"
        );
        
        return {
            loan,
            owner,
            borrower,
            lender,
            admin,
            loanAmount,
            interestRate,
            duration
        };
    }

    describe("Loan Lifecycle Tests", function () {
        it("Should initialize loan with correct parameters", async function () {
            const { loan, borrower, loanAmount, interestRate, duration } = await loadFixture(deployLoanFixture);
            
            expect(await loan.borrower()).to.equal(borrower.address);
            expect(await loan.amount()).to.equal(loanAmount);
            expect(await loan.interestRate()).to.equal(interestRate);
            expect(await loan.duration()).to.equal(duration);
            expect(await loan.isActive()).to.be.false;
        });

        it("Should allow lender to fund the loan", async function () {
            const { loan, lender, loanAmount } = await loadFixture(deployLoanFixture);
            
            await expect(
                loan.connect(lender).fund({ value: loanAmount })
            ).to.emit(loan, "LoanFunded");
            
            expect(await loan.lender()).to.equal(lender.address);
            expect(await loan.isActive()).to.be.true;
        });

        it("Should prevent funding with incorrect amount", async function () {
            const { loan, lender, loanAmount } = await loadFixture(deployLoanFixture);
            
            const incorrectAmount = loanAmount.div(2);
            
            await expect(
                loan.connect(lender).fund({ value: incorrectAmount })
            ).to.be.revertedWith("Incorrect funding amount");
        });

        it("Should prevent double funding", async function () {
            const { loan, lender, loanAmount } = await loadFixture(deployLoanFixture);
            
            await loan.connect(lender).fund({ value: loanAmount });
            
            await expect(
                loan.connect(lender).fund({ value: loanAmount })
            ).to.be.revertedWith("Loan already funded");
        });

        it("Should allow borrower to repay loan", async function () {
            const { loan, borrower, lender, loanAmount, interestRate } = await loadFixture(deployLoanFixture);
            
            // Fund the loan first
            await loan.connect(lender).fund({ value: loanAmount });
            
            // Calculate repayment amount
            const interest = loanAmount.mul(interestRate).div(10000);
            const repaymentAmount = loanAmount.add(interest);
            
            await expect(
                loan.connect(borrower).repay({ value: repaymentAmount })
            ).to.emit(loan, "LoanRepaid");
            
            expect(await loan.isRepaid()).to.be.true;
        });

        it("Should handle loan default after duration expires", async function () {
            const { loan, borrower, lender, loanAmount, duration } = await loadFixture(deployLoanFixture);
            
            // Fund the loan
            await loan.connect(lender).fund({ value: loanAmount });
            
            // Advance time past loan duration
            await time.increase(duration + 1);
            
            // Check if loan is in default
            expect(await loan.isDefaulted()).to.be.true;
        });
    });

    describe("Security and Edge Cases", function () {
        it("Should prevent unauthorized operations", async function () {
            const { loan, owner, loanAmount } = await loadFixture(deployLoanFixture);
            
            await expect(
                loan.connect(owner).fund({ value: loanAmount })
            ).to.be.revertedWith("Not authorized");
        });

        it("Should handle zero amount edge case", async function () {
            const [owner, borrower] = await ethers.getSigners();
            
            const Loan = await ethers.getContractFactory("Loan");
            
            await expect(
                Loan.deploy(
                    borrower.address,
                    0, // Zero amount
                    500,
                    365 * 24 * 60 * 60,
                    "Test loan"
                )
            ).to.be.revertedWith("Invalid loan amount");
        });

        it("Should calculate interest correctly", async function () {
            const { loan, loanAmount, interestRate } = await loadFixture(deployLoanFixture);
            
            const expectedInterest = loanAmount.mul(interestRate).div(10000);
            const calculatedInterest = await loan.calculateInterest();
            
            expect(calculatedInterest).to.equal(expectedInterest);
        });

        it("Should prevent repayment before funding", async function () {
            const { loan, borrower, loanAmount } = await loadFixture(deployLoanFixture);
            
            await expect(
                loan.connect(borrower).repay({ value: loanAmount })
            ).to.be.revertedWith("Loan not funded");
        });
    });
});
