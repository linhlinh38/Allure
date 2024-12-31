import { AppDataSource } from "../dataSource";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BadRequestError } from "../errors/error";
import { ProductEnum, StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { productService } from "./product.service";

const repository = AppDataSource.getRepository(ProductDiscount);
class ProductDiscountService extends BaseService<ProductDiscount> {
  constructor() {
    super(repository);
  }
  async getAll() {
    const products = repository.find({
      relations: ["product"],
    });

    return products;
  }

  async getProductDiscountActiveOfBrand(
    brandId: string
  ): Promise<ProductDiscount[]> {
    const products = await repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productDiscountClassifications"
      )
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("productClassifications.images", "images")
      .leftJoinAndSelect("product.brand", "brand")
      .where("productDiscount.status = :status", { status: StatusEnum.ACTIVE })
      .andWhere("product.status = :productStatus", {
        productStatus: ProductEnum.FLASH_SALE,
      })
      .andWhere("brand.id = :brandId", { brandId })
      .getMany();

    return products;
  }

  async getProductDiscountOfBrand(brandId: string): Promise<ProductDiscount[]> {
    const products = await repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productDiscountClassifications"
      )
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("productClassifications.images", "images")
      .leftJoinAndSelect("product.brand", "brand")
      .where("product.status IN (:...productStatus)", {
        productStatus: [ProductEnum.OFFICIAL, ProductEnum.FLASH_SALE],
      })
      .andWhere("brand.id = :brandId", { brandId })
      .getMany();

    return products;
  }

  async getProductDiscountOfProduct(
    productId: string
  ): Promise<ProductDiscount[]> {
    const products = await repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productDiscountClassifications"
      )
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("productClassifications.images", "images")
      .leftJoinAndSelect("product.brand", "brand")
      .where("product.id = :productId", { productId })
      .getMany();

    return products;
  }

  async beforeCreate(data: ProductDiscount) {
    const existingProduct = await productService.findById(data.product);
    if (!existingProduct) {
      throw new BadRequestError("Product does not exist.");
    }
  }

  async create(data: any): Promise<ProductDiscount> {
    let productDiscount;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeCreate(data);

      productDiscount = await queryRunner.manager.save(ProductDiscount, data);

      for (const classification of data.productClassifications) {
        const { images, ...classificationFields } = classification;
        const classificationResponse = await queryRunner.manager.save(
          ProductClassification,
          {
            ...classificationFields,
            productDiscount,
          }
        );

        if (classification.originalClassification) {
          const originalClassificationRecord =
            await queryRunner.manager.findOne(ProductClassification, {
              where: { id: classification.originalClassification },
            });
          await queryRunner.manager.update(
            ProductClassification,
            { id: classification.originalClassification },
            {
              quantity:
                originalClassificationRecord.quantity - classification.quantity,
            }
          );
        }

        if (classification.images && classification.images.length > 0) {
          for (const image of classification.images) {
            await queryRunner.manager.save(ProductImage, {
              ...image,
              productClassification: classificationResponse,
            });
          }
        }
      }

      await queryRunner.commitTransaction();
      return productDiscount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, data: any): Promise<ProductDiscount> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productDiscountRepository =
        queryRunner.manager.getRepository(ProductDiscount);

      const productClassificationRepository = queryRunner.manager.getRepository(
        ProductClassification
      );

      const productImageRepository =
        queryRunner.manager.getRepository(ProductImage);

      const productDiscount = await productDiscountRepository.findOne({
        where: { id },
        relations: ["productClassifications", "product"],
      });

      if (!productDiscount) {
        throw new Error("Product not found.");
      }

      if (
        data.productClassifications &&
        data.productClassifications.length > 0
        // data.productClassifications[0].type === ClassificationTypeEnum.CUSTOM
      ) {
        // await productClassificationRepository.delete({
        //   preOrderProduct: { id },
        //   type: ClassificationTypeEnum.DEFAULT,
        // });

        for (const classification of data.productClassifications) {
          const { images, ...classificationFields } = classification;
          const currentClassificationRecord = await queryRunner.manager.findOne(
            ProductClassification,
            {
              where: { id: classificationFields.id },
            }
          );

          let classificationResponse;
          if (classificationFields.id) {
            await productClassificationRepository.update(
              classificationFields.id,
              classificationFields
            );
            classificationResponse = classification;

            const originalClassificationRecord =
              await queryRunner.manager.findOne(ProductClassification, {
                where: {
                  product: { id: productDiscount.product.id },
                  title: classification.title,
                },
              });

            if (
              originalClassificationRecord.quantity -
                (classification.quantity -
                  currentClassificationRecord.quantity) <
              0
            ) {
              throw new BadRequestError(
                "Invalid classification quantity: Quantity should be smaller than the current stock"
              );
            }
            await queryRunner.manager.update(
              ProductClassification,
              { id: originalClassificationRecord.id },
              {
                quantity:
                  originalClassificationRecord.quantity -
                  (classification.quantity -
                    currentClassificationRecord.quantity),
              }
            );
          } else {
            classificationResponse = await productClassificationRepository.save(
              {
                ...classificationFields,
                productDiscount,
              }
            );

            if (classification.originalClassification) {
              const originalClassificationRecord =
                await queryRunner.manager.findOne(ProductClassification, {
                  where: { id: classification.originalClassification },
                });
              await queryRunner.manager.update(
                ProductClassification,
                { id: classification.originalClassification },
                {
                  quantity:
                    originalClassificationRecord.quantity -
                    classification.quantity,
                }
              );
            }
          }

          if (classification.images && classification.images.length > 0) {
            for (const image of classification.images) {
              if (image.id) {
                await productImageRepository.update(image.id, image);
              } else {
                await productImageRepository.save({
                  ...image,
                  productClassification: classificationResponse,
                });
              }
            }
          }
        }
      }

      const { productClassifications, ...updateData } = data;
      await productDiscountRepository.update(id, updateData);

      await queryRunner.commitTransaction();

      const updatedProduct = await productDiscountRepository.findOne({
        where: { id },
        relations: ["productClassifications", "product"],
      });

      return updatedProduct!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const productDiscountService = new ProductDiscountService();
