import { AppDataSource } from '../dataSource';
import { BrandStatusTracking } from '../entities/brandStatusTracking.entity';

export const brandStatusTrackingRepository = AppDataSource.getRepository(BrandStatusTracking);
