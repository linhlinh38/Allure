import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { plainToInstance } from 'class-transformer';
import { AuthRequest } from '../middleware/authentication';
import { GroupBuyingJoinEventRequest } from '../dtos/request/groupBuying.request';
import { groupBuyingService } from '../services/groupBuying.service';
import { Paging } from '../dtos/other/paging.dto';

export default class GroupBuyingController {
  static async startToEnd(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await groupBuyingService.startToEnd(
        req.params.groupBuyingId,
        req.loginUser
      );
      return createNormalResponse(res, 'Start to end success');
    } catch (err) {
      next(err);
    }
  }
  static async getOrderByGroupBuyingId(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    const order = await groupBuyingService.getOrderByGroupBuyingId(
      req.params.groupBuyingId,
      req.loginUser
    );
    try {
      return createNormalResponse(
        res,
        order ? 'Get order success' : 'No order yet',
        order
      );
    } catch (err) {
      next(err);
    }
  }
  static async updateOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
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
        'Update order success',
        await groupBuyingService.updateOrder(
          groupBuyingJoinEventBody,
          req.params.orderId
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async endGroupBuying(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const isEventEndSuccess = await groupBuyingService.endGroupBuying(
        req.params.groupBuyingId
      );
      return createNormalResponse(
        res,
        !isEventEndSuccess
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
  static async getByBrand(req: AuthRequest, res: Response, next: NextFunction) {
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
          req.params.groupBuyingId,
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

  static async filter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filterRequest = req.body;
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
      const result = await groupBuyingService.filter(filterRequest, paging);
      return createNormalResponse(res, 'Filter group buyings success', result);
    } catch (err) {
      next(err);
    }
  }
}
