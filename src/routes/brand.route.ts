import express from 'express';
import BrandController from '../controllers/brand.controller';
import validate from '../utils/validate';
import {
  BrandCreateSchema,
  BrandUpdateSchema,
  BrandUpdateStatusSchema,
} from '../dtos/request/brand.request';
import authentication from '../middleware/authentication';
const brandRoute = express.Router();
brandRoute.get('/', BrandController.getAll);
brandRoute.get('/get-by-id/:id', BrandController.getById);
brandRoute.post('/search', BrandController.search);
brandRoute.get(
  '/get-status-trackings/:brandId',
  BrandController.getStatusTrackings
);
brandRoute.put(
  '/update-detail/:id',
  validate(BrandUpdateSchema),
  BrandController.updateDetail
);

brandRoute.use(authentication);
brandRoute.put(
  '/update-status',
  validate(BrandUpdateStatusSchema),
  BrandController.updateStatus
);
brandRoute.post(
  '/create',
  validate(BrandCreateSchema),
  BrandController.requestCreateBrand
);
brandRoute.post(
  '/toggle-follow/:id',
  BrandController.toggleFollowBrand
);
brandRoute.get('/get-followed-brands', BrandController.getFollowedBrands);
export default brandRoute;
