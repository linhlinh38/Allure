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

export default transactionRouter;
