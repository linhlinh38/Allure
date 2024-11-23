import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BadRequestError } from "../errors/error";
import { ProductEnum, StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { productService } from "./product.service";
import cron from "node-cron";

const repository = AppDataSource.getRepository(PreOrderProduct);
class PreOrderProductService extends BaseService<PreOrderProduct> {
  constructor() {
    super(repository);
  }
  async beforeCreate(data: PreOrderProduct) {
    const existingProduct = await productService.findById(data.product);
    if (!existingProduct) {
      throw new BadRequestError("Product does not exist.");
    }
  }

  async create(data: any): Promise<PreOrderProduct> {
    let preOrderProduct;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (data.productData) {
        const product = await queryRunner.manager.save(
          Product,
          data.productData
        );

        let productClassification: ProductClassification[] = [];

        const classificationsWithProduct =
          data.productData.productClassifications.map((classification) => ({
            ...classification,
            product,
          }));
        productClassification = await queryRunner.manager.save(
          ProductClassification,
          classificationsWithProduct
        );

        let images: ProductImage[] = [];
        if (data.productData.images && data.productData.images.length > 0) {
          const productImages = data.productData.images.map((image) => ({
            ...image,
            product,
          }));
          images = await queryRunner.manager.save(ProductImage, productImages);
        }

        preOrderProduct = await queryRunner.manager.save(PreOrderProduct, {
          ...data,
          product,
        });
      } else {
        preOrderProduct = await queryRunner.manager.save(PreOrderProduct, data);

        const classificationsWithPreOrderPoduct =
          data.productClassifications.map((classification) => ({
            ...classification,
            preOrderProduct,
          }));
        await queryRunner.manager.save(
          ProductClassification,
          classificationsWithPreOrderPoduct
        );
      }

      await queryRunner.commitTransaction();
      return preOrderProduct;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const preOrderProductService = new PreOrderProductService();

const startPreOrderCheck = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();
    console.log("cron running!");

    try {
      await queryRunner.connect();

      const preOrderProducts = await queryRunner.manager.find(PreOrderProduct, {
        relations: ["product"],
      });

      const currentDate = new Date();

      for (const preOrder of preOrderProducts) {
        const startTime = new Date(preOrder.startTime);
        const endTime = new Date(preOrder.endTime);

        if (
          currentDate >= startTime &&
          currentDate <= endTime &&
          preOrder.product.status !== ProductEnum.PRE_ORDER
        ) {
          await queryRunner.manager.update(Product, preOrder.product.id, {
            status: ProductEnum.PRE_ORDER,
          });

          console.log(
            `Product ${preOrder.product.id} has been updated to PRE-ORDER status.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating pre-order products:", error);
    } finally {
      await queryRunner.release();
    }
  });
};

const endPreOrderCheck = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      const preOrderProducts = await queryRunner.manager.find(PreOrderProduct, {
        relations: ["product"],
      });

      const currentDate = new Date();

      for (const preOrder of preOrderProducts) {
        const endTime = new Date(preOrder.endTime);

        if (currentDate > endTime && preOrder.status === "ACTIVE") {
          await queryRunner.manager.update(PreOrderProduct, preOrder.id, {
            status: StatusEnum.INACTIVE,
          });

          await queryRunner.manager.update(Product, preOrder.product.id, {
            status: ProductEnum.OUT_OF_STOCK,
          });

          console.log(
            `PreOrderProduct ${preOrder.id} marked as INACTIVE and Product ${preOrder.product.id} marked as OUT_OF_STOCK.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating expired pre-order products:", error);
    } finally {
      await queryRunner.release();
    }
  });
};

startPreOrderCheck();
endPreOrderCheck();
