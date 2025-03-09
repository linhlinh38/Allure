import { AppDataSource } from '../dataSource';
import { RejectRefundRequest } from '../entities/rejectRefundRequest.entity';

export const rejectRefundRequestRepository =
  AppDataSource.getRepository(RejectRefundRequest);
