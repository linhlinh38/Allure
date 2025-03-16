import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { createNormalResponse } from '../utils/response';
import { plainToInstance } from 'class-transformer';
import {
  RequestRefundRequest,
  PreOrderRequest,
  UpdateOrderStatusRequest,
  OrderNormalRequest,
  MakeDicisionRefundRequest,
  MakeDicisionRejectRefundRequest,
  ComplaintRequestRequest,
  MakeDicisionComplaintRequest,
  SearchOrderRequest,
  GetMyRequestsRequest,
} from '../dtos/request/order.request';
import { AuthRequest } from '../middleware/authentication';
import { ActionReceivedEnum } from '../utils/enum';

export default class OrderController {
  static async getMyRequests(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const getMyRequestsRequest = plainToInstance(
        GetMyRequestsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Get my requests successfully',
        await orderService.getMyRequests(req.loginUser, getMyRequestsRequest)
      );
    } catch (err) {
      next(err);
    }
  }

  static async takeReceivedAction(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const isReceived = await orderService.takeReceivedAction(
        req.body.action as ActionReceivedEnum,
        req.params.orderId
      );
      return createNormalResponse(
        res,
        isReceived
          ? 'Received successfully'
          : 'Extend received time successfully'
      );
    } catch (err) {
      next(err);
    }
  }
  static async getRequestsOfOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get requests success',
        await orderService.getRequestsOfOrder(req.params.orderId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async makeDecisionOnComplaintRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const makeDicisionComplaintRequest = plainToInstance(
        MakeDicisionComplaintRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      const isApproved = await orderService.makeDecisionOnComplaintRequest(
        req.params.requestId,
        makeDicisionComplaintRequest
      );
      return createNormalResponse(
        res,
        isApproved ? 'Approved request success' : 'Reject request success'
      );
    } catch (err) {
      next(err);
    }
  }
  static async requestComlaint(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const complainRequest = plainToInstance(
        ComplaintRequestRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Request complaint success',
        await orderService.requestComplaint(complainRequest, req.params.orderId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async makeDecisionOnRejectRefundRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const makeDicisionRejectRefundRequest = plainToInstance(
        MakeDicisionRejectRefundRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      const isApproved = await orderService.makeDecisionOnRejectRefundRequest(
        req.params.requestId,
        makeDicisionRejectRefundRequest
      );
      return createNormalResponse(
        res,
        isApproved ? 'Approved request success' : 'Reject request success'
      );
    } catch (err) {
      next(err);
    }
  }
  // static async getBothRequestRefundCancel(
  //   req: AuthRequest,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   try {
  //     return createNormalResponse(
  //       res,
  //       'Get both requests success',
  //       await orderService.getBothRequestRefundCancel(req.params.orderId)
  //     );
  //   } catch (err) {
  //     next(err);
  //   }
  // }
  static async makeDecisionOnRefundRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const makeDicisionRefundRequest = plainToInstance(
        MakeDicisionRefundRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      const isApproved = await orderService.makeDecisionOnRefundRequest(
        req.params.requestId,
        makeDicisionRefundRequest
      );
      return createNormalResponse(
        res,
        isApproved ? 'Approved request success' : 'Reject request success'
      );
    } catch (err) {
      next(err);
    }
  }
  static async requestRefund(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const requestRefundRequest = plainToInstance(
        RequestRefundRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Request refund success',
        await orderService.requestRefund(
          requestRefundRequest,
          req.params.orderId,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
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
      let isApproved = await orderService.makeDecisionOnRequest(
        req.params.requestId,
        req.body.status,
        req.body.reasonRejected
      );
      return createNormalResponse(
        res,
        isApproved
          ? 'Approved cancel request successfully'
          : 'Rejected cancel request successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get order successfully',
        await orderService.getById(req.params.orderId)
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
      const updateOrderStatusRequest = plainToInstance(
        UpdateOrderStatusRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      await orderService.updateStatus(
        updateOrderStatusRequest,
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
      let cancelStatus = await orderService.customerCancelOrder(
        req.params.orderId,
        req.body.reason,
        req.loginUser
      );
      return createNormalResponse(
        res,
        cancelStatus == 1
          ? 'Cancel order successfully'
          : 'Send cancel request success'
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
      const searchOrderRequest = plainToInstance(SearchOrderRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return createNormalResponse(
        res,
        'Get my orders success',
        await orderService.getMyOrders(searchOrderRequest, req.loginUser)
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
