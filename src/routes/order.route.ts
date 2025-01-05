import express from 'express';
import authentication from '../middleware/authentication';
import OrderController from '../controllers/order.controller';
import { OrderNormalCreateSchema, SearchOrderSchema, UpdateOrderStatusSchema } from '../dtos/request/order.request';
import validate from '../utils/validate';

const orderRouter = express.Router();
orderRouter.get('/', OrderController.getAll);
orderRouter.get('/get-by-id/:orderId', OrderController.gerById);
orderRouter.get('/get-by-brand/:brandId', OrderController.getByBrand);
orderRouter.use(authentication);
orderRouter.post(
  '/get-my-orders/',
  validate(SearchOrderSchema),
  OrderController.getMyOrders
);
orderRouter.post('/create-normal', validate(OrderNormalCreateSchema), OrderController.createNormal);
orderRouter.put(
  '/update-status/:orderId',
  validate(UpdateOrderStatusSchema),
  OrderController.updateStatus
);
orderRouter.post('/create-pre-order', OrderController.createPreOrder);
orderRouter.post('/create-group-order', OrderController.createGroupOrder);
export default orderRouter;
