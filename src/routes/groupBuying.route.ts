import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import GroupBuyingController from '../controllers/groupBuying.controller';
import { GroupBuyingJoinEventSchema } from '../dtos/request/groupBuying.request';

const groupBuyingRouter = express.Router();
groupBuyingRouter.get('/', GroupBuyingController.getAll);
groupBuyingRouter.post('/get-by-status', GroupBuyingController.getByStatus);
groupBuyingRouter.post('/get-by-brand/:brandId', GroupBuyingController.getByBrand);
groupBuyingRouter.get(
  '/get-by-id/:groupBuyingId',
  GroupBuyingController.getById
);
groupBuyingRouter.post(
  '/end-group-buying/:groupBuyingId',
  GroupBuyingController.endGroupBuying
);
groupBuyingRouter.use(authentication);
groupBuyingRouter.post(
  '/buy/:groupProductId',
  validate(GroupBuyingJoinEventSchema),
  GroupBuyingController.buy
);
groupBuyingRouter.post(
  '/get-my-group-buyings',
  GroupBuyingController.getMyGroupBuyings
);
export default groupBuyingRouter;
