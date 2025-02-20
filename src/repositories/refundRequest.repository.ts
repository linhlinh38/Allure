import { AppDataSource } from '../dataSource';
import { RefundRequest } from '../entities/refundRequest.entity';

export const refundRequestRepository = AppDataSource.getRepository(
  RefundRequest
);
