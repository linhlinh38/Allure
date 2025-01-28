import { NextFunction, Request, Response } from 'express';
import { serviceService } from '../services/service.service';
import { createNormalResponse } from '../utils/response';
import { walletService } from '../services/wallet.service';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { WalletCreateRequest } from '../dtos/request/wallet.request';
export default class WalletController {
  static async getWalletByAccountId(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get wallet success',
        await walletService.getWalletByAccountId(req.params.accountId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getMyWallet(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get my wallet success',
        await walletService.getMyWallet(req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const wallets = await walletService.findAll();
      return createNormalResponse(res, 'Get all wallets success', wallets);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get wallet success',
        await walletService.getById(req.params.id)
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await walletService.updateByAccountId(
        req.body.balance as number,
        req.params.accountId
      );
      return createNormalResponse(res, 'Update wallet success');
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const walletCreateRequest = plainToInstance(
        WalletCreateRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      await walletService.createWallet(walletCreateRequest);
      return createNormalResponse(res, 'Create wallet success');
    } catch (err) {
      next(err);
    }
  }
}
