import { CreatePaymentUrlSchema } from './../dtos/request/payment.request';
import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import PaymentController from '../controllers/payment.controller';

const paymentRouter = express.Router();
paymentRouter.post(
  '/create-payment-url',
  authentication,
  validate(CreatePaymentUrlSchema),
  PaymentController.createPaymentUrl
);
export default paymentRouter;
