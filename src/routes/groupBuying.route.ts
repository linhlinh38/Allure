import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import GroupBuyingController from '../controllers/groupBuying.controller';
import { GroupBuyingJoinEventSchema } from '../dtos/request/groupBuying.request';
import { GroupBuyingFilterSchema } from '../dtos/request/groupBuyingFilter.request';

const groupBuyingRouter = express.Router();
groupBuyingRouter.get('/', GroupBuyingController.getAll);
groupBuyingRouter.post('/get-by-status', GroupBuyingController.getByStatus);
groupBuyingRouter.post(
  '/get-by-brand/:brandId',
  GroupBuyingController.getByBrand
);
groupBuyingRouter.get(
  '/get-by-id/:groupBuyingId',
  GroupBuyingController.getById
);
groupBuyingRouter.use(authentication);
groupBuyingRouter.get(
  '/get-order/:groupBuyingId',
  GroupBuyingController.getOrderByGroupBuyingId
);
groupBuyingRouter.post(
  '/update-order/:orderId',
  validate(GroupBuyingJoinEventSchema),
  GroupBuyingController.updateOrder
);
groupBuyingRouter.post(
  '/end-group-buying/:groupBuyingId',
  GroupBuyingController.endGroupBuying
);
groupBuyingRouter.post(
  '/start-to-end/:groupBuyingId',
  GroupBuyingController.startToEnd
);
groupBuyingRouter.post(
  '/buy/:groupBuyingId',
  validate(GroupBuyingJoinEventSchema),
  GroupBuyingController.buy
);
groupBuyingRouter.post(
  '/get-my-group-buyings',
  GroupBuyingController.getMyGroupBuyings
);
groupBuyingRouter.post(
  '/filter',
  validate(GroupBuyingFilterSchema),
  GroupBuyingController.filter
);
export default groupBuyingRouter;
