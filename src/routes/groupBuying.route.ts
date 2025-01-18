import express from 'express';
import authentication from '../middleware/authentication';
import {
  GroupProductCreateSchema,
  GroupProductUpdateSchema,
} from '../dtos/request/groupProduct.request';
import validate from '../utils/validate';
import GroupBuyingController from '../controllers/groupBuying.controller';
import { GroupBuyingJoinEventSchema } from '../dtos/request/groupBuying.request';

const groupBuyingRouter = express.Router();
groupBuyingRouter.get('/', GroupBuyingController.getAll);
groupBuyingRouter.get(
  '/get-by-id/:groupProductId',
  GroupBuyingController.getById
);
groupBuyingRouter.use(authentication);
groupBuyingRouter.post(
  '/buy/:groupProductId',
  validate(GroupBuyingJoinEventSchema),
  GroupBuyingController.buy
);
export default groupBuyingRouter;
