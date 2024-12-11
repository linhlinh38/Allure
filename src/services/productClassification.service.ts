import { AppDataSource } from "../dataSource";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ProductClassification);
class ProductClassificationService extends BaseService<ProductClassification> {
  constructor() {
    super(repository);
  }

  async create(
    productClassificationData: ProductClassification
  ): Promise<ProductClassification> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productClassification = await queryRunner.manager.save(
        ProductClassification,
        productClassificationData
      );

      let images: ProductImage[] = [];
      if (
        productClassificationData.images &&
        productClassificationData.images.length > 0
      ) {
        const productImages = productClassificationData.images.map((image) => ({
          ...image,
          productClassification,
        }));
        images = await queryRunner.manager.save(ProductImage, productImages);
      }
      await queryRunner.commitTransaction();
      return productClassification;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const productClassificationService = new ProductClassificationService();
