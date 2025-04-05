import { NextFunction, Response } from 'express';
import { WithdrawalRequestService } from '../services/withdrawalRequest.service';
import {
  CreateWithdrawalRequest,
  UpdateWithdrawalRequest,
  FilterWithdrawalRequest,
} from '../dtos/request/withdrawalRequest.request';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { createNormalResponse } from '../utils/response';

export class WithdrawalRequestController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    const request = plainToInstance(CreateWithdrawalRequest, req.body, {
      excludeExtraneousValues: true,
    });

    try {
      const withdrawalRequest = await WithdrawalRequestService.create(
        req.loginUser,
        request
      );
      return createNormalResponse(
        res,
        'Create withdrawal request success',
        withdrawalRequest
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const request = plainToInstance(UpdateWithdrawalRequest, req.body, {
      excludeExtraneousValues: true,
    });
    try {
      const withdrawalRequest = await WithdrawalRequestService.update(
        id,
        request,
        req.loginUser
      );
      return createNormalResponse(
        res,
        'Update withdrawal request success',
        withdrawalRequest
      );
    } catch (error) {
      next(error);
    }
  }

  static async getWithdrawalRequests(req: AuthRequest, res: Response) {
    const withdrawalRequests =
      await WithdrawalRequestService.getWithdrawalRequests(req.loginUser);
    return createNormalResponse(
      res,
      'Get withdrawal requests success',
      withdrawalRequests
    );
  }

  static async getById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const withdrawalRequest = await WithdrawalRequestService.getById(
      id,
      req.loginUser
    );
    return createNormalResponse(
      res,
      'Get withdrawal request success',
      withdrawalRequest
    );
  }

  static async filter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filter = plainToInstance(FilterWithdrawalRequest, req.body, {
        excludeExtraneousValues: true,
      });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await WithdrawalRequestService.filter(filter, page, limit);
      return createNormalResponse(
        res,
        'Get withdrawal request success',
        result
      );
    } catch (error) {
      next(error);
    }
  }
}
