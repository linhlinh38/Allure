import { AppDataSource } from '../dataSource';
import { PreOrderProduct } from '../entities/preOrderProduct.entity';

export const preOrderProductRepository = AppDataSource.getRepository(
  PreOrderProduct
);
