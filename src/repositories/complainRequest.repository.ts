import { AppDataSource } from '../dataSource';
import { ComplaintRequest } from '../entities/complainRequest';

export const complaintRequestRepository = AppDataSource.getRepository(ComplaintRequest);
