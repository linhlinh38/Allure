import { Response, NextFunction } from 'express';
import { BankAccountService } from '../services/bankAccount.service';
import { plainToInstance } from 'class-transformer';
import {
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from '../dtos/request/bankAccount.request';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';

export class BankAccountController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bankAccountData = plainToInstance(
        CreateBankAccountRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );

      const bankAccount = await BankAccountService.create(
        req.loginUser,
        bankAccountData
      );
      return createNormalResponse(
        res,
        'Bank account created successfully',
        bankAccount
      );
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bankAccountData = plainToInstance(
        UpdateBankAccountRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );

      const bankAccount = await BankAccountService.update(
        req.params.id,
        req.loginUser,
        bankAccountData
      );
      return createNormalResponse(
        res,
        'Bank account updated successfully',
        bankAccount
      );
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await BankAccountService.delete(req.params.id, req.loginUser);
      return createNormalResponse(res, 'Bank account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBankAccounts(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const bankAccounts = await BankAccountService.getBankAccounts(
        req.loginUser
      );
      return createNormalResponse(
        res,
        'Bank accounts retrieved successfully',
        bankAccounts
      );
    } catch (error) {
      next(error);
    }
  }

  static async getBankAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const bankAccount = await BankAccountService.getBankAccount(
        req.params.id,
        req.loginUser
      );
      return createNormalResponse(
        res,
        'Bank account retrieved successfully',
        bankAccount
      );
    } catch (error) {
      next(error);
    }
  }
}
