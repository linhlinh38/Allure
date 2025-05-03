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
  OrderFilterRequest,
  OrderRequestFilterRequest,
  GetQuantitySoldRequest,
} from '../dtos/request/order.request';
import { AuthRequest } from '../middleware/authentication';
import {
  ActionReceivedEnum,
  PaymentMethodEnum,
  ShippingStatusEnum,
} from '../utils/enum';
import { Paging } from '../dtos/other/paging.dto';

export default class OrderController {
  static async filterAndVoucher(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
      const orderFilterRequest = plainToInstance(OrderFilterRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return createNormalResponse(
        res,
        'Filter orders success',
        await orderService.filterAndVoucher(
          orderFilterRequest,
          paging,
          req.loginUser,
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getQuantitySold(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const getQuantitySoldRequest = plainToInstance(
        GetQuantitySoldRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Get quantity sold success',
        await orderService.getQuantitySold(getQuantitySoldRequest)
      );
    } catch (err) {
      next(err);
    }
  }
  static async updatePaymentMethod(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Update payment method success',
        await orderService.updatePaymentMethod(
          req.params.orderId,
          req.body.paymentMethod
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getByVoucher(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
      return createNormalResponse(
        res,
        'Get orders by voucher success',
        await orderService.getByVoucher(req.params.voucherId, paging)
      );
    } catch (err) {
      next(err);
    }
  }
  static async filterParent(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
      const orderFilterRequest = plainToInstance(OrderFilterRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return createNormalResponse(
        res,
        'Filter orders success',
        await orderService.filter(
          orderFilterRequest,
          paging,
          req.loginUser,
          true
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async filter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
      const orderFilterRequest = plainToInstance(OrderFilterRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return createNormalResponse(
        res,
        'Filter orders success',
        await orderService.filter(orderFilterRequest, paging, req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
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
        req.params.orderId,
        req.loginUser
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
        makeDicisionComplaintRequest,
        req.loginUser
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
        makeDicisionRejectRefundRequest,
        req.loginUser
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
        makeDicisionRefundRequest,
        req.loginUser
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
        req.body.reasonRejected,
        req.loginUser
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

  static async getParentById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get order successfully',
        await orderService.getParentById(req.params.orderId)
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

  static async cancelParentOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await orderService.cancelParentOrderWhenToPay(
        req.params.orderId,
        req.body.reason
      );
      return createNormalResponse(res, 'Cancel order successfully');
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

  static async getChildren(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const orders = await orderService.getChildren(req.loginUser);
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
      const parentOrder = await orderService.createNormal(
        orderNormalBody,
        req.loginUser
      );
      if (
        parentOrder.paymentMethod == PaymentMethodEnum.WALLET &&
        parentOrder.status == ShippingStatusEnum.TO_PAY
      ) {
        return createNormalResponse(
          res,
          'Wallet not enough money, turn to To Pay order ',
          parentOrder
        );
      }
      return createNormalResponse(
        res,
        'Create order successfully',
        parentOrder
      );
    } catch (err) {
      next(err);
    }
  }

  static async filterOrderRequests(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filter = plainToInstance(OrderRequestFilterRequest, req.body, {
        excludeExtraneousValues: true,
      });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await orderService.filterOrderRequests(
        filter,
        { page, limit },
        req.loginUser
      );

      return createNormalResponse(res, 'Get order requests success', result);
    } catch (err) {
      next(err);
    }
  }
}
