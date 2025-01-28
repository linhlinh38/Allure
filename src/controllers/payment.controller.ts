import { CreatePaymentUrlRequest } from './../dtos/request/payment.request';
import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { paymentService } from '../services/payment.service';

export default class PaymentController {
  static async createPaymentUrl(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const payment = plainToInstance(CreatePaymentUrlRequest, req.body, {
        excludeExtraneousValues: true,
      });
      return res.status(200).json({
        message: 'Return url success',
        data: await paymentService.createPaymentUrl(payment)
      });
    } catch (err) {
      next(err);
    }
  }
}
