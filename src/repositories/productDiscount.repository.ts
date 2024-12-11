import { AppDataSource } from '../dataSource';
import { ProductDiscount } from '../entities/productDiscount.entity';

export const productDiscountRepository = AppDataSource.getRepository(
  ProductDiscount
);
