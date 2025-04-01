import { AppDataSource } from '../dataSource';
import { WithdrawalRequest } from '../entities/withdrawalRequest.entity';

export const withdrawalRequestRepository =
  AppDataSource.getRepository(WithdrawalRequest);
