import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { createNormalResponse } from '../utils/response';
import { plainToInstance } from 'class-transformer';
import {
  OrderNormalRequest,
  PreOrderRequest,
} from '../dtos/request/order.request';
import { AuthRequest } from '../middleware/authentication';

export default class OrderController {
  static async getCancelRequestById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get request successfully',
        await orderService.getCancelRequestById(req.params.requestId)
      );
    } catch (err) {
      next(err);
    }
  }

  static async getMyCancelRequests(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get requests successfully',
        await orderService.getMyCancelRequests(req.body.status, req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }

  static async getCancelRequestOfBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get requests successfully',
        await orderService.getCancelRequestOfBrand(
          req.params.brandId,
          req.body.status
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async makeDecisionOnRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await orderService.makeDecisionOnRequest(
        req.params.requestId,
        req.body.status
      );
      return createNormalResponse(res, 'Make decision on request successfully');
    } catch (err) {
      next(err);
    }
  }

  static async gerById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get order successfully',
        await orderService.gerById(req.params.orderId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async updateStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await orderService.updateStatus(
        req.body.status,
        req.params.orderId,
        req.loginUser
      );
      return createNormalResponse(res, 'Update order status successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getStatusTrackingOfOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get status trackings successfully',
        await orderService.getStatusTrackingOfOrder(req.params.orderId)
      );
    } catch (err) {
      next(err);
    }
  }

  static async brandCancelOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Cancel order successfully',
        await orderService.brandCancelOrder(
          req.params.orderId,
          req.body.reason,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async customerCancelOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Cancel order successfully',
        await orderService.customerCancelOrder(
          req.params.orderId,
          req.body.reason,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async createGroupOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const preOrderBody = plainToInstance(PreOrderRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await orderService.createPreOrder(preOrderBody, req.loginUser);
      return createNormalResponse(res, 'Create order successfully');
    } catch (err) {
      next(err);
    }
  }

  static async createPreOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const preOrderBody = plainToInstance(PreOrderRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await orderService.createPreOrder(preOrderBody, req.loginUser);
      return createNormalResponse(res, 'Create order successfully');
    } catch (err) {
      next(err);
    }
  }
  static async getMyOrders(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const search = req.body.search as string;
      return createNormalResponse(
        res,
        'Get my orders success',
        await orderService.getMyOrders(
          search?.trim(),
          req.body.status,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getByBrand(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get orders by brand success',
        await orderService.getByBrand(req.params.brandId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.getAllTotalOrders();
      return createNormalResponse(res, 'Get all orders success', orders);
    } catch (err) {
      next(err);
    }
  }

  static async createNormal(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const orderNormalBody = plainToInstance(OrderNormalRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return createNormalResponse(
        res,
        'Create order successfully',
        await orderService.createNormal(orderNormalBody, req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
}
