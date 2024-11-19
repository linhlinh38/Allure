import { AppDataSource } from '../dataSource';
import { Brand } from '../entities/brand.entity';

export const brandRepository = AppDataSource.getRepository(Brand);
