import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import TransactionController from '../controllers/transaction.controller';
import {
  FilterTransactionSchema,
  GetBrandRevenueStatisticsSchema,
  GetConsultantRevenueStatisticsSchema,
  GetDailyBookingStatisticsSchema,
  GetDailyOrderStatisticsSchema,
  GetDailySystemStatisticsSchema,
  GetFinancialSummarySchema,
  OrderStatisticsSchema,
  PaySchema,
} from '../dtos/request/transaction.request';
const transactionRouter = express.Router();

transactionRouter.use(authentication);

transactionRouter.get('/', TransactionController.getAll);
transactionRouter.post('/deposit', TransactionController.deposit);
transactionRouter.post('/auto-deposit', TransactionController.autoDeposit);
transactionRouter.post('/pay', validate(PaySchema), TransactionController.pay);

transactionRouter.post(
  '/filter',
  validate(FilterTransactionSchema),
  TransactionController.filter
);

// transactionRouter.post(
//   '/filter-for-brand/:brandId',
//   validate(FilterTransactionSchema),
//   TransactionController.filterForBrand
// );

// transactionRouter.post(
//   '/filter-for-consultant',
//   validate(FilterTransactionSchema),
//   TransactionController.filterForConsultant
// );

// transactionRouter.post(
//   '/filter-for-admin',
//   validate(FilterTransactionSchema),
//   TransactionController.filterForAdmin
// );

transactionRouter.post(
  '/get-daily-order-statistics',
  validate(GetDailyOrderStatisticsSchema),
  TransactionController.getDailyOrderStatistics
);

transactionRouter.post(
  '/get-daily-booking-statistics',
  validate(GetDailyBookingStatisticsSchema),
  TransactionController.getDailyBookingStatistics
);

transactionRouter.post(
  '/get-daily-system-statistics',
  validate(GetDailySystemStatisticsSchema),
  TransactionController.getDailySystemStatistics
);

transactionRouter.post(
  '/brand-revenue',
  validate(GetBrandRevenueStatisticsSchema),
  TransactionController.brandRevenue
);

transactionRouter.post(
  '/consultant-revenue',
  validate(GetConsultantRevenueStatisticsSchema),
  TransactionController.consultantRevenue
);

transactionRouter.post(
  '/order-statistics',
  validate(OrderStatisticsSchema),
  TransactionController.getOrderStatistics
);

// transactionRouter.post(
//   '/get-user-spending-statistics',
//   validate(GetStatisticsSchema),
//   TransactionController.getUserSpendingStatistics
// );

// transactionRouter.post(
//   '/get-brand-revenue-statistics/:brandId',
//   validate(GetStatisticsSchema),
//   TransactionController.getBrandRevenueStatistics
// );

transactionRouter.post(
  '/get-financial-summary',
  validate(GetFinancialSummarySchema),
  TransactionController.getFinancialSummary
);

transactionRouter.get(
  '/get-financial-summary',
  TransactionController.getFinancialSummary
);


export default transactionRouter;
