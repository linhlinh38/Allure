import express from 'express';
import authentication from '../middleware/authentication';
import GroupProductController from '../controllers/groupProduct.controller';
import { GroupProductCreateSchema, GroupProductUpdateSchema } from '../dtos/request/groupProduct.request';
import validate from '../utils/validate';

const groupProductRouter = express.Router();
groupProductRouter.get('/', GroupProductController.getAll);
groupProductRouter.get(
  '/get-by-id/:groupProductId',
  GroupProductController.getById
);
groupProductRouter.use(authentication);
groupProductRouter.post(
  '/create',
  validate(GroupProductCreateSchema),
  GroupProductController.create
);
groupProductRouter.put(
  '/update/:groupProductId',
  validate(GroupProductUpdateSchema),
  GroupProductController.update
);
groupProductRouter.post(
  '/toggle-status/:groupProductId',
  GroupProductController.toggleStatus
);
groupProductRouter.post('/start-event', GroupProductController.startEvent);
groupProductRouter.get(
  '/is-in-any-events/:groupProductId',
  GroupProductController.isInAnyEvents
);
export default groupProductRouter;
