import { plainToInstance } from 'class-transformer';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { Request, NextFunction, Response } from 'express';
import { GetStatisticsRequest } from '../dtos/request/transaction.request';
import { transactionService } from '../services/transaction.service';

export default class TransactionController {
  static async getBrandRevenueStatistics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const getBrandRevenueStatisticsRequest = plainToInstance(
        GetStatisticsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Can apply voucher',
        await transactionService.getBrandRevenueStatistics(
          getBrandRevenueStatisticsRequest,
          req.params.brandId
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getUserSpendingStatistics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const getUserSpendingStatisticsRequest = plainToInstance(
        GetStatisticsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Can apply voucher',
        await transactionService.getUserSpendingStatistics(
          getUserSpendingStatisticsRequest,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async canApplyVoucher(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {}
}
