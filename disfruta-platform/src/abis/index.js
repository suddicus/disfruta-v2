import LoanFactory from './LoanFactory.json';
import UserRegistry from './UserRegistry.json';
import CreditScoring from './CreditScoring.json';
import LendingPool from './LendingPool.json';
import Treasury from './Treasury.json';
import Loan from './Loan.json';

export const LoanFactoryABI = Array.isArray(LoanFactory) ? LoanFactory : LoanFactory.abi;
export const UserRegistryABI = Array.isArray(UserRegistry) ? UserRegistry : UserRegistry.abi;
export const CreditScoringABI = Array.isArray(CreditScoring) ? CreditScoring : CreditScoring.abi;
export const LendingPoolABI = Array.isArray(LendingPool) ? LendingPool : LendingPool.abi;
export const TreasuryABI = Array.isArray(Treasury) ? Treasury : Treasury.abi;
export const LoanABI = Array.isArray(Loan) ? Loan : Loan.abi;
