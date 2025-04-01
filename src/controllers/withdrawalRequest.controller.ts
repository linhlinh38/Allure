import { Response } from 'express';
import { WithdrawalRequestService } from '../services/withdrawalRequest.service';
import {
  CreateWithdrawalRequest,
  UpdateWithdrawalRequest,
} from '../dtos/request/withdrawalRequest.request';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { createNormalResponse } from '../utils/response';

export class WithdrawalRequestController {
  static async create(req: AuthRequest, res: Response) {
    const request = plainToInstance(CreateWithdrawalRequest, req.body, {
      excludeExtraneousValues: true,
    });

    const withdrawalRequest = await WithdrawalRequestService.create(
      req.loginUser,
      request
    );
    return createNormalResponse(
      res,
      'Create withdrawal request success',
      withdrawalRequest
    );
  }

  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const request = plainToInstance(UpdateWithdrawalRequest, req.body, {
      excludeExtraneousValues: true,
    });

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

  static async getWithdrawalRequest(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const withdrawalRequest =
      await WithdrawalRequestService.getWithdrawalRequest(id, req.loginUser);
    return createNormalResponse(
      res,
      'Get withdrawal request success',
      withdrawalRequest
    );
  }

  static async getAllWithdrawalRequests(req: AuthRequest, res: Response) {
    const withdrawalRequests =
      await WithdrawalRequestService.getAllWithdrawalRequests();
    return createNormalResponse(
      res,
      'Get all withdrawal requests success',
      withdrawalRequests
    );
  }
}
