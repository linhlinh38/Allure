import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import TransactionController from '../controllers/transaction.controller';
import { getStatisticsSchema } from '../dtos/request/transaction.request';
const transactionRouter = express.Router();

transactionRouter.use(authentication);

transactionRouter.post(
  '/get-user-spending-statistics',
  validate(getStatisticsSchema),
  TransactionController.getUserSpendingStatistics
);

transactionRouter.post(
  '/get-brand-revenue-statistics/:brandId',
  validate(getStatisticsSchema),
  TransactionController.getBrandRevenueStatistics
);

export default transactionRouter;
