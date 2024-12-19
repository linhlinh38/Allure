import express from 'express';
import authentication from '../middleware/authentication';
import GroupProductController from '../controllers/groupProduct.controller';
import { GroupProductCreateSchema } from '../dtos/request/groupProduct.request';
import validate from '../utils/validate';

const groupProductRouter = express.Router();
groupProductRouter.get('/', GroupProductController.getAll);
groupProductRouter.use(authentication);
groupProductRouter.post(
  '/create',
  validate(GroupProductCreateSchema),
  GroupProductController.create
);
groupProductRouter.post(
  '/update-products',
  GroupProductController.updateProducts
);
groupProductRouter.post('/start-event', GroupProductController.startEvent);
groupProductRouter.get(
  '/is-in-any-events/:groupProductId',
  GroupProductController.isInAnyEvents
);
export default groupProductRouter;
