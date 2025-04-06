import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import TransactionController from '../controllers/transaction.controller';
import {
  FilterTransactionSchema,
  GetStatisticsSchema,
  PaySchema,
} from '../dtos/request/transaction.request';
const transactionRouter = express.Router();

transactionRouter.use(authentication);

transactionRouter.post('/deposit', TransactionController.deposit);
transactionRouter.post('/pay', validate(PaySchema), TransactionController.pay);

transactionRouter.post(
  '/filter',
  validate(FilterTransactionSchema),
  TransactionController.filter
);

transactionRouter.post(
  '/filter-for-brand/:brandId',
  validate(FilterTransactionSchema),
  TransactionController.filterForBrand
);

transactionRouter.post(
  '/filter-for-consultant',
  validate(FilterTransactionSchema),
  TransactionController.filterForConsultant
);

transactionRouter.post(
  '/filter-for-admin',
  validate(FilterTransactionSchema),
  TransactionController.filterForAdmin
);

transactionRouter.post(
  '/get-user-spending-statistics',
  validate(GetStatisticsSchema),
  TransactionController.getUserSpendingStatistics
);

transactionRouter.post(
  '/get-brand-revenue-statistics/:brandId',
  validate(GetStatisticsSchema),
  TransactionController.getBrandRevenueStatistics
);

transactionRouter.get(
  '/get-financial-summary',
  TransactionController.getFinancialSummary
);

export default transactionRouter;
