import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { createBadResponse, createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { voucherService } from '../services/voucher.service';
import { VoucherRequest } from '../dtos/request/voucher.request';
import { Voucher } from '../entities/voucher.entity';

export default class VoucherController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get all vouchers success',
        await voucherService.getAll()
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get voucher success',
        await voucherService.getById(req.params.id)
      );
    } catch (err) {
      next(err);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const searches = req.body.searches;
      return createNormalResponse(
        res,
        'Search success',
        await voucherService.search(searches)
      );
    } catch (err) {
      next(err);
    }
  }

  static async updateDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const voucherBody = plainToInstance(VoucherRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await voucherService.updateDetail(req.params.id, voucherBody);

      return createNormalResponse(res, 'Update success');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const voucher: Voucher = await voucherService.findById(req.params.id);
      if (!voucher) return createBadResponse(res, 'No voucher found');
      await voucherService.update(voucher.id, {status: req.body.status});
      return createNormalResponse(res, 'Update status success');
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const voucherBody = plainToInstance(VoucherRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await voucherService.createVoucher(voucherBody);
      return createNormalResponse(res, 'Create success');
    } catch (err) {
      next(err);
    }
  }
}
