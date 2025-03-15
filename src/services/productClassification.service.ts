import { In, Not } from "typeorm";
import { AppDataSource } from "../dataSource";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BaseService } from "./base.service";
import {
  PreOrderProductEnum,
  ProductDiscountEnum,
  ProductEnum,
  StatusEnum,
} from "../utils/enum";
import { BadRequestError } from "../errors/error";
import { productRepository } from "../repositories/product.repository";
import { Product } from "../entities/product.entity";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";

const repository = AppDataSource.getRepository(ProductClassification);
class ProductClassificationService extends BaseService<ProductClassification> {
  constructor() {
    super(repository);
  }

  async checkSkuUniqueness(
    sku: string,
    productId?: string,
    preOrderProductId?: string,
    productDiscountId?: string,
    brandId?: string
  ) {
    let checkSku: ProductClassification[] = [];

    if (!brandId) {
      if (productId) {
        const product = await productRepository.findOne({
          where: { id: productId },
          relations: ["brand"],
        });
        if (!product) {
          throw new BadRequestError("Product not found");
        }
        brandId = product.brand.id;
      } else if (preOrderProductId) {
        const preOrderProduct = await productRepository.findOne({
          where: { preOrderProducts: { id: preOrderProductId } },
          relations: ["brand"],
        });
        if (!preOrderProduct) {
          throw new BadRequestError("PreOrderProduct not found");
        }

        brandId = preOrderProduct.brand.id;
      } else if (productDiscountId) {
        const productDiscount = await productRepository.findOne({
          where: { productDiscounts: { id: productDiscountId } },
          relations: ["brand"],
        });
        if (!productDiscount) {
          throw new BadRequestError("ProductDiscount not found");
        }
        brandId = productDiscount.brand.id;
      }
    }
    if (brandId) {
      checkSku = await this.repository.find({
        where: [
          {
            product: {
              brand: { id: brandId },
            },
            sku,
            status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
          },
          {
            preOrderProduct: {
              product: { brand: { id: brandId } },
            },
            sku,
            status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
          },
          {
            productDiscount: {
              product: { brand: { id: brandId } },
            },
            sku,
            status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
          },
        ],
      });
    }

    return checkSku;
  }

  async beforeCreate(body: any) {
    // if (body.sku && body.sku !== "" && body.product) {
    //   const product = await productRepository.findOne({
    //     where: { id: body.product },
    //     relations: ["brand"],
    //   });
    //   if (!product) {
    //     throw new BadRequestError("Product not found");
    //   }

    //   const checkSku = await this.repository.find({
    //     where: [
    //       {
    //         product: {
    //           brand: { id: product.brand.id },
    //           status: Not(In([ProductEnum.INACTIVE, ProductEnum.BANNED])),
    //         },
    //         sku: body.sku,
    //         status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
    //       },
    //       {
    //         preOrderProduct: {
    //           product: { brand: { id: product.brand.id } },
    //           status: Not(
    //             In([
    //               PreOrderProductEnum.INACTIVE,
    //               PreOrderProductEnum.CANCELLED,
    //             ])
    //           ),
    //         },
    //         sku: body.sku,
    //         status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
    //       },
    //     ],
    //   });

    //   if (checkSku.length !== 0)
    //     throw new BadRequestError("sku already exists");
    // }
    // if (body.sku && body.sku !== "" && body.preOrderProduct) {
    //   const checkSku = await this.repository.find({
    //     where: {
    //       preOrderProduct: { id: body.preOrderProduct },
    //       sku: body.sku,
    //       status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
    //     },
    //   });

    //   if (checkSku.length !== 0)
    //     throw new BadRequestError("sku already exists");
    // }
    // if (body.sku && body.sku !== "" && body.productDiscount) {
    //   const checkSku = await this.repository.find({
    //     where: {
    //       productDiscount: { id: body.productDiscount },
    //       sku: body.sku,
    //       status: Not(In([StatusEnum.INACTIVE, StatusEnum.BANNED])),
    //     },
    //   });

    //   if (checkSku.length !== 0)
    //     throw new BadRequestError("sku already exists");
    // }

    if (body.sku && body.sku !== "") {
      const checkSku = await this.checkSkuUniqueness(
        body.sku,
        body?.product,
        body?.preOrderProduct,
        body?.productDiscount
      );

      if (checkSku.length !== 0) {
        throw new BadRequestError("SKU already exists in the brand");
      }
    }
  }

  async beforeUpdate(id: string, body: any) {
    const productClassification = await this.repository.findOne({
      where: { id },
      relations: ["product", "preOrderProduct", "productDiscount"],
    });

    if ((body.sku && body.sku !== "") || body?.status === StatusEnum.ACTIVE) {
      const checkSku = await this.checkSkuUniqueness(
        body.sku ?? productClassification.sku,
        body.product ?? productClassification?.product?.id,
        body.preOrderProduct ?? productClassification?.preOrderProduct?.id,
        body.productDiscount ?? productClassification?.productDiscount?.id
      );

      if (checkSku.length !== 0 && checkSku[0].id !== id) {
        throw new BadRequestError("SKU already exists in the brand");
      }
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
          isAvailable: false,
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

  async updateClassificationsQuantity(
    updates: { classificationId: string; quantity: number }[]
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        const classification = await queryRunner.manager.findOne(
          ProductClassification,
          {
            where: { id: update.classificationId },
            relations: [
              "product",
              "preOrderProduct",
              "productDiscount",
              "preOrderProduct.product",
              "productDiscount.product",
            ],
          }
        );

        if (!classification) {
          throw new BadRequestError("Classification invalid!");
        }
        if (
          classification.productDiscount &&
          (classification.productDiscount.product.status ===
            ProductEnum.BANNED ||
            classification.productDiscount.product.status ===
              ProductEnum.INACTIVE)
        ) {
          throw new BadRequestError(
            `The Product is ${classification.productDiscount.product.status}!`
          );
        }
        if (
          classification.preOrderProduct &&
          (classification.preOrderProduct.product.status ===
            ProductEnum.BANNED ||
            classification.preOrderProduct.product.status ===
              ProductEnum.INACTIVE)
        ) {
          throw new BadRequestError(
            `The Product is ${classification.preOrderProduct.product.status}!`
          );
        }
        if (update.quantity < 1) {
          throw new BadRequestError(
            "Classification quantity must be greater than 0!"
          );
        }
        const originalClassification = await queryRunner.manager.findOne(
          ProductClassification,
          {
            where: {
              product: { id: classification.productDiscount.product.id },
              title: classification.title,
            },
          }
        );
        if (
          originalClassification.quantity -
            (update.quantity - classification.quantity) <
          0
        ) {
          throw new BadRequestError(
            "Invalid classification quantity: Quantity should be smaller than the current stock"
          );
        }
        await queryRunner.manager.update(
          ProductClassification,
          { id: originalClassification.id },
          {
            quantity:
              originalClassification.quantity -
              (update.quantity - classification.quantity),
          }
        );
        const { classificationId, quantity } = update;
        await queryRunner.manager.update(
          ProductClassification,
          { id: classificationId },
          { quantity }
        );
        const currentDate = new Date();
        if (
          classification.product &&
          classification.product.status === ProductEnum.OUT_OF_STOCK
        ) {
          await queryRunner.manager.update(
            Product,
            { id: classification.product.id },
            { status: ProductEnum.OFFICIAL }
          );
        }
        if (
          classification.preOrderProduct &&
          classification.preOrderProduct.status ===
            PreOrderProductEnum.SOLD_OUT &&
          currentDate < new Date(classification.preOrderProduct.endTime)
        ) {
          await queryRunner.manager.update(
            PreOrderProduct,
            { id: classification.preOrderProduct.id },
            { status: PreOrderProductEnum.ACTIVE }
          );
        }
        if (
          classification.productDiscount &&
          classification.productDiscount.status ===
            ProductDiscountEnum.SOLD_OUT &&
          currentDate < new Date(classification.productDiscount.endTime)
        ) {
          await queryRunner.manager.update(
            ProductDiscount,
            { id: classification.productDiscount.id },
            { status: ProductDiscountEnum.ACTIVE }
          );
          await queryRunner.manager.update(
            Product,
            { id: classification.productDiscount.product.id },
            { status: ProductEnum.FLASH_SALE }
          );
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const productClassificationService = new ProductClassificationService();
