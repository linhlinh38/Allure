import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { groupProductService } from '../services/groupProduct.service';
import { plainToInstance } from 'class-transformer';
import { GroupProductRequest } from '../dtos/request/groupProduct.request';
import { AuthRequest } from '../middleware/authentication';
import { GroupBuyingRequest } from '../dtos/request/groupBuying.request';
export default class GroupProductController {
  static async startEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const groupBuyingBody = plainToInstance(GroupBuyingRequest, req.body, {
        excludeExtraneousValues: true,
      });
      const newGroupBuying = await groupProductService.startEvent(
        groupBuyingBody,
        req.loginUser
      );
      return createNormalResponse(res, 'Start event success', newGroupBuying);
    } catch (err) {
      next(err);
    }
  }

  static async isInAnyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const isInAnyEvents: boolean = await groupProductService.isInAnyEvents(
        req.params.groupProductId
      );
      if (isInAnyEvents)
        return createNormalResponse(res, 'It is in events', true);
      return createNormalResponse(res, 'It is not in any events', false);
    } catch (err) {
      next(err);
    }
  }

  static async updateProducts(req: Request, res: Response, next: NextFunction) {
    try {
      await groupProductService.updateProducts(
        req.body.productIds as string[],
        req.body.groupProductId
      );
      return createNormalResponse(res, 'Update products success');
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categorys = await groupProductService.getAll();
      return createNormalResponse(
        res,
        'Get all group products success',
        categorys
      );
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const groupProductBody = plainToInstance(GroupProductRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await groupProductService.createGroupProduct(groupProductBody);
      return createNormalResponse(res, 'Create group product success');
    } catch (err) {
      next(err);
    }
  }
}
