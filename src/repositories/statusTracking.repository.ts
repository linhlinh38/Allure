import { AppDataSource } from '../dataSource';
import { StatusTracking } from '../entities/statusTracking.entity';

export const statusTrackingRepository = AppDataSource.getRepository(StatusTracking);
