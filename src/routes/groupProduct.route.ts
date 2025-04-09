import express from 'express';
import authentication from '../middleware/authentication';
import GroupProductController from '../controllers/groupProduct.controller';
import {
  GroupProductCreateSchema,
  GroupProductUpdateSchema,
  FilterGroupProductSchema,
} from '../dtos/request/groupProduct.request';
import validate from '../utils/validate';
import { GroupBuyingCreateSchema } from '../dtos/request/groupBuying.request';

const groupProductRouter = express.Router();
groupProductRouter.get('/get-by-status', GroupProductController.getByStatus);
groupProductRouter.get(
  '/get-by-brand/:brandId',
  GroupProductController.getByBrand
);
groupProductRouter.get(
  '/get-brands-have-group-products',
  GroupProductController.getBrandsHaveGroupProducts
);
groupProductRouter.get(
  '/get-by-id/:groupProductId',
  GroupProductController.getById
);
groupProductRouter.post(
  '/filter',
  validate(FilterGroupProductSchema),
  GroupProductController.filter
);
groupProductRouter.use(authentication);
groupProductRouter.get('/', GroupProductController.getAll);
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
groupProductRouter.post(
  '/start-event',
  validate(GroupBuyingCreateSchema),
  GroupProductController.startEvent
);
groupProductRouter.get(
  '/is-in-any-events/:groupProductId',
  GroupProductController.isInAnyEvents
);
export default groupProductRouter;
