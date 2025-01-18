import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { groupProductService } from '../services/groupProduct.service';
import { plainToInstance } from 'class-transformer';
import {
  GroupProductCreateRequest,
  GroupProductUpdateRequest,
} from '../dtos/request/groupProduct.request';
import { AuthRequest } from '../middleware/authentication';
import { GroupBuyingJoinEventRequest, GroupBuyingRequest } from '../dtos/request/groupBuying.request';
import { StatusEnum } from '../utils/enum';
import { groupBuyingService } from '../services/groupBuying.service';
export default class GroupBuyingController {
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
        await groupBuyingService.buy(groupBuyingJoinEventBody, req.params.groupProductId, req.loginUser)
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
      const groupProducts = await groupProductService.getAll();
      return createNormalResponse(
        res,
        'Get all group buying success',
        groupProducts
      );
    } catch (err) {
      next(err);
    }
  }

}
