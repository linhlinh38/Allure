import { AppDataSource } from "../dataSource";
import { ProductClassification } from "../entities/productClassification.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ProductClassification);
class ProductClassificationService extends BaseService<ProductClassification> {
  constructor() {
    super(repository);
  }
}
export const productClassificationService = new ProductClassificationService();
