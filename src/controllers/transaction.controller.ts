import { plainToInstance } from 'class-transformer';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { NextFunction, Response } from 'express';
import {
  FilterTransactionRequest,
  GetStatisticsRequest,
} from '../dtos/request/transaction.request';
import { transactionService } from '../services/transaction.service';
import { Paging } from '../dtos/other/paging.dto';

export default class TransactionController {
  static async deposit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Deposit successfully',
        await transactionService.deposit(
          req.body.orderId,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async filter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
      const filterTransactionRequest = plainToInstance(
        FilterTransactionRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Filter transactions successfully',
        await transactionService.filter(
          filterTransactionRequest,
          req.loginUser,
          paging
        )
      );
    } catch (err) {
      next(err);
    }
  }
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
