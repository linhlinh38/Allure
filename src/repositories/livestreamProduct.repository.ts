import { AppDataSource } from '../dataSource';
import { LivestreamProduct } from '../entities/livestreamProduct.entity';

export const livestreamProductRepository = AppDataSource.getRepository(LivestreamProduct);
