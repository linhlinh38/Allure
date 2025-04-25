import { plainToInstance } from 'class-transformer';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { NextFunction, Response } from 'express';
import {
  FilterTransactionRequest,
  GetDailyBookingStatisticsRequest,
  GetDailyOrderStatisticsRequest,
  GetStatisticsRequest,
  PayRequest,
} from '../dtos/request/transaction.request';
import { transactionService } from '../services/transaction.service';
import { Paging } from '../dtos/other/paging.dto';

export default class TransactionController {
  static async getDailyBookingStatistics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const getDailyBookingStatisticsRequest = plainToInstance(
        GetDailyBookingStatisticsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Get daily booking statistics successfully',
        await transactionService.getDailyBookingStatistics(
          getDailyBookingStatisticsRequest,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async generalRevenueOrderBooking(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get general revenue successfully',
        await transactionService.generalRevenueOrderBooking(
          req.body.startDate,
          req.body.endDate,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async consultantRevenue(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get consultant revenue successfully',
        await transactionService.consultantRevenue(
          req.body.startDate,
          req.body.endDate,
          req.body.consultantId,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getOrderStatistics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get order statistics successfully',
        await transactionService.getOrderStatistics(req.body.brandId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async brandRevenue(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get brand revenue successfully',
        await transactionService.brandRevenue(
          req.body.startDate,
          req.body.endDate,
          req.body.brandId
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getFinancialSummary(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get financial summary successfully',
        await transactionService.getFinancialSummary(req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
  static async pay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payRequest = plainToInstance(PayRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return createNormalResponse(
        res,
        'Pay successfully',
        await transactionService.pay(payRequest)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get transactions successfully',
        await transactionService.getAll(req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
  static async deposit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Deposit successfully',
        await transactionService.deposit(req.body.orderId, req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
  static async filterForConsultant(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
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
        await transactionService.filterForConsultant(
          filterTransactionRequest,
          paging,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async filterForBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
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
        await transactionService.filterForBrand(
          filterTransactionRequest,
          paging,
          req.params.brandId
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async filterForAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
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
        await transactionService.filterForAdmin(
          filterTransactionRequest,
          paging
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
        'Statistic successfully',
        await transactionService.getBrandRevenueStatistics(
          getBrandRevenueStatisticsRequest,
          req.params.brandId
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getDailyOrderStatistics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const getDailyOrderStatisticsRequest = plainToInstance(
        GetDailyOrderStatisticsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Statistic successfully',
        await transactionService.getDailyOrderStatistics(
          getDailyOrderStatisticsRequest
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
        'Statistic successfully',
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
