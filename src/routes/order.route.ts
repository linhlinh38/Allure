import express from 'express';
import authentication from '../middleware/authentication';
import OrderController from '../controllers/order.controller';
import {
  CancelOrderSchema,
  CancelOrderStatusSchema,
  GetMyRequestsSchema,
  OrderNormalCreateSchema,
  RequestComlaintSchema,
  RequestRefundSchema,
  RequestStatusSchema,
  SearchOrderSchema,
  TakeReceivedActionSchema,
  UpdateOrderStatusSchema,
} from '../dtos/request/order.request';
import validate from '../utils/validate';

const orderRouter = express.Router();
orderRouter.get('/', OrderController.getAll);
orderRouter.get('/get-by-id/:orderId', OrderController.getById);
orderRouter.get('/get-by-brand/:brandId', OrderController.getByBrand);
orderRouter.use(authentication);
orderRouter.post(
  '/get-my-orders/',
  validate(SearchOrderSchema),
  OrderController.getMyOrders
);
orderRouter.post(
  '/create-normal',
  validate(OrderNormalCreateSchema),
  OrderController.createNormal
);
orderRouter.put(
  '/update-status/:orderId',
  validate(UpdateOrderStatusSchema),
  OrderController.updateStatus
);
orderRouter.get(
  '/get-status-tracking/:orderId',
  OrderController.getStatusTrackingOfOrder
);
orderRouter.get(
  '/get-requests-of-order/:orderId',
  OrderController.getRequestsOfOrder
);
orderRouter.get(
  '/get-cancel-request-by-id/:requestId',
  OrderController.getCancelRequestById
);
orderRouter.post(
  '/customer-cancel-order/:orderId',
  validate(CancelOrderSchema),
  OrderController.customerCancelOrder
);
orderRouter.post(
  '/brand-cancel-order/:orderId',
  validate(CancelOrderSchema),
  OrderController.brandCancelOrder
);
orderRouter.post(
  '/make-decision-on-request/:requestId',
  OrderController.makeDecisionOnRequest
);
orderRouter.post(
  '/get-cancel-request-of-brand/:brandId',
  validate(RequestStatusSchema),
  OrderController.getCancelRequestOfBrand
);
orderRouter.post(
  '/get-my-cancel-requests',
  validate(CancelOrderStatusSchema),
  OrderController.getMyCancelRequests
);
orderRouter.post(
  '/request-refund/:orderId',
  validate(RequestRefundSchema),
  OrderController.requestRefund
);
orderRouter.post(
  '/request-complaint/:orderId',
  validate(RequestComlaintSchema),
  OrderController.requestComlaint
);
// orderRouter.get(
//   '/get-both-request-refund-cancel/:orderId',
//   OrderController.getBothRequestRefundCancel
// );
orderRouter.post(
  '/make-decision-on-refund-request/:requestId',
  validate(RequestStatusSchema),
  OrderController.makeDecisionOnRefundRequest
);

orderRouter.post(
  '/make-decision-on-reject-refund-request/:requestId',
  validate(RequestStatusSchema),
  // Author(['ADMIN']),
  OrderController.makeDecisionOnRejectRefundRequest
);
orderRouter.post(
  '/make-decision-on-complaint-request/:requestId',
  validate(RequestStatusSchema),
  // Author(['ADMIN']),
  OrderController.makeDecisionOnComplaintRequest
);
orderRouter.post(
  '/take-received-action/:orderId',
  validate(TakeReceivedActionSchema),
  // Author(['ADMIN']),
  OrderController.takeReceivedAction);
orderRouter.post(
  '/get-my-requests',
  // Author(['ADMIN']),
  validate(GetMyRequestsSchema),
  OrderController.getMyRequests
);
orderRouter.post('/create-pre-order', OrderController.createPreOrder);
orderRouter.post('/create-group-order', OrderController.createGroupOrder);
export default orderRouter;
