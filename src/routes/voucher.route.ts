import express from 'express';
import validate from '../utils/validate';
import authentication from '../middleware/authentication';
import VoucherController from '../controllers/voucher.controller';
import { VoucherCreateSchema, VoucherUpdateSchema, VoucherUpdateStatusSchema } from '../dtos/request/voucher.request';
const voucherRoute = express.Router();
voucherRoute.get('/', VoucherController.getAll);
voucherRoute.get('/get-by-id/:id', VoucherController.getById);
voucherRoute.post('/search', VoucherController.search);
voucherRoute.post(
  '/create',
  validate(VoucherCreateSchema),
  VoucherController.create
);
voucherRoute.put(
  '/update-detail/:id',
  validate(VoucherUpdateSchema),
  VoucherController.updateDetail
);
voucherRoute.put(
  '/update-detail/:id',
  validate(VoucherUpdateStatusSchema),
  VoucherController.updateStatus
);
voucherRoute.use(authentication);
export default voucherRoute;
