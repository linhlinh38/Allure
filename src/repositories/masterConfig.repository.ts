import { AppDataSource } from '../dataSource';
import { MasterConfig } from '../entities/masterConfig.entity';

export const masterConfigRepository = AppDataSource.getRepository(MasterConfig);
