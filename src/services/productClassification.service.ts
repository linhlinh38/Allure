import { In, Not } from "typeorm";
import { AppDataSource } from "../dataSource";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BaseService } from "./base.service";
import { StatusEnum } from "../utils/enum";
import { BadRequestError } from "../errors/error";

const repository = AppDataSource.getRepository(ProductClassification);
class ProductClassificationService extends BaseService<ProductClassification> {
  constructor() {
    super(repository);
  }

  async beforeCreate(body: any) {
    if (body.sku && body.sku !== "" && body.product) {
      const checkSku = await this.repository.find({
        where: {
          product: { id: body.product },
          sku: body.sku,
          status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
        },
      });

      if (checkSku.length !== 0)
        throw new BadRequestError("sku already exists");
    }
    if (body.sku && body.sku !== "" && body.preOrderProduct) {
      const checkSku = await this.repository.find({
        where: {
          preOrderProduct: { id: body.preOrderProduct },
          sku: body.sku,
          status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
        },
      });

      if (checkSku.length !== 0)
        throw new BadRequestError("sku already exists");
    }
    if (body.sku && body.sku !== "" && body.productDiscount) {
      const checkSku = await this.repository.find({
        where: {
          productDiscount: { id: body.productDiscount },
          sku: body.sku,
          status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
        },
      });

      if (checkSku.length !== 0)
        throw new BadRequestError("sku already exists");
    }
  }

  async create(
    productClassificationData: ProductClassification
  ): Promise<ProductClassification> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeCreate(productClassificationData);
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

  async updateClassificationTitle(
    productClassificationData: Partial<ProductClassification>,
    oldClassificationId: string
  ): Promise<ProductClassification> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //await this.beforeCreate(productClassificationData);
      const oldClassification = await queryRunner.manager.findOne(
        ProductClassification,
        {
          where: { id: oldClassificationId },
        }
      );

      if (!oldClassification) {
        throw new BadRequestError("Classification not found!");
      }
      await queryRunner.manager.update(
        ProductClassification,
        oldClassificationId,
        {
          status: StatusEnum.INACTIVE,
        }
      );

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
