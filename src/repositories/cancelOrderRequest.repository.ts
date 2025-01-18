import { AppDataSource } from '../dataSource';
import { CancelOrderRequest } from '../entities/cancelOrderRequest.entity';

export const cancelOrderRequestRepository =
  AppDataSource.getRepository(CancelOrderRequest);
