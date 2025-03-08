import { AppDataSource } from '../dataSource';
import { RejectRefundRequest } from '../entities/rejectRefundRequest.entity';

export const rjectRefundRequestRepository = AppDataSource.getRepository(
  RejectRefundRequest
);
