import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { groupProductService } from '../services/groupProduct.service';
import { plainToInstance } from 'class-transformer';
import { AuthRequest } from '../middleware/authentication';
import { GroupBuyingJoinEventRequest } from '../dtos/request/groupBuying.request';
import { groupBuyingService } from '../services/groupBuying.service';
export default class GroupBuyingController {
  static async endGroupBuying(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    const isEventEndSuccess = await groupBuyingService.endGroupBuying(
      req.params.groupBuyingId
    );
    try {
      return createNormalResponse(
        res,
        isEventEndSuccess
          ? 'Group buyings can not meet criteria. Cancel all orders'
          : 'End group buying success'
      );
    } catch (err) {
      next(err);
    }
  }
  static async getByStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get group buyings success',
        await groupBuyingService.getByStatus(req.body.status)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getByBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get group buyings success',
        await groupBuyingService.getByBrand(req.params.brandId, req.body.status)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getMyGroupBuyings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get my group buyings success',
        await groupBuyingService.getMyGroupBuyings(
          req.loginUser,
          req.body.status
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async buy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const groupBuyingJoinEventBody = plainToInstance(
        GroupBuyingJoinEventRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Buy success',
        await groupBuyingService.buy(
          groupBuyingJoinEventBody,
          req.params.groupProductId,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get group buying success',
        await groupBuyingService.getById(req.params.groupBuyingId)
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const groupBuyings = await groupBuyingService.getAll();
      return createNormalResponse(
        res,
        'Get all group buying success',
        groupBuyings
      );
    } catch (err) {
      next(err);
    }
  }
}
