import { AppDataSource } from '../dataSource';
import { Product } from '../entities/product.entity';

export const productRepository = AppDataSource.getRepository(
  Product
);
