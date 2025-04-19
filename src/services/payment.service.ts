import { CreatePaymentUrlRequest } from '../dtos/request/payment.request';
import { payos } from '../utils/payos';
import { config } from '../configs/envConfig';
import { getRandomNumber } from '../utils/getRandomNumber';

class PaymentService {
  async createPaymentUrl(payment: CreatePaymentUrlRequest) {
    return {
      url: (
        await payos.createPaymentLink({
          description: payment.description,
          orderCode: getRandomNumber(),
          amount: payment.amount,
          cancelUrl: payment.cancelUrl
            ? payment.cancelUrl
            : config.PAYOS_CANCEL_URL,
          returnUrl: payment.returnUrl
            ? payment.returnUrl
            : config.PAYOS_RETURN_URL,
        })
      ).checkoutUrl,
    };
  }
}

export const paymentService = new PaymentService();
