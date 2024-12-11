import { AppDataSource } from '../dataSource';
import { ProductClassification } from '../entities/productClassification.entity';

export const productClassificationRepository = AppDataSource.getRepository(ProductClassification);
