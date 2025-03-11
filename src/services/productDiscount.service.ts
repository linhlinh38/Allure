import { AppDataSource } from "../dataSource";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BadRequestError } from "../errors/error";
import { orderDetailRepository } from "../repositories/orderDetail.repository";
import { productDiscountRepository } from "../repositories/productDiscount.repository";
import { ProductDiscountEnum, ProductEnum, StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { productService } from "./product.service";
import { productClassificationService } from "./productClassification.service";

const repository = AppDataSource.getRepository(ProductDiscount);
interface FilterOptions {
  startTime?: Date;
  endTime?: Date;
  productId?: string;
  brandId?: string;
  status?: ProductDiscountEnum;
  sortBy?: string;
  order?: string;
  limit?: number;
  page?: number;
}

class ProductDiscountService extends BaseService<ProductDiscount> {
  async getSoldAmount(id: string) {
    const productDiscount = await productDiscountRepository.findOne({
      where: { id },
    });
    if (!productDiscount)
      throw new BadRequestError(`ProductDiscount not found`);
    const result = await orderDetailRepository
      .createQueryBuilder("od")
      .innerJoin("od.productClassification", "pc")
      .innerJoin("pc.productDiscount", "pd")
      .select("COALESCE(SUM(od.quantity), 0)", "total_sales")
      .where("pd.id = :id", { id })
      .getRawOne();

    return result?.total_sales || 0;
  }
  constructor() {
    super(repository);
  }
  async getAll() {
    const productDiscounts = await this.repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productClassifications",
        "productClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "classificationImages",
        "classificationImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .getMany();

    return productDiscounts;
  }

  async getById(id: string) {
    const productDiscount = await this.repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productClassifications",
        "productClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "classificationImages",
        "classificationImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .where("productDiscount.id = :id", { id })
      .getOne();

    return productDiscount;
  }

  async getProductDiscountActiveOfBrand(
    brandId: string
  ): Promise<ProductDiscount[]> {
    const products = await repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productDiscountClassifications",
        "productDiscountClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productDiscountClassifications.images",
        "productDiscountClassificationsImages",
        "productDiscountClassificationsImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications",
        "productClassifications.status = :productClassifications",
        { productClassifications: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "images",
        "images.status = :images",
        { images: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect("product.brand", "brand")
      .where("productDiscount.status = :status", {
        status: ProductDiscountEnum.ACTIVE,
      })
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
        "productDiscountClassifications",
        "productDiscountClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productDiscountClassifications.images",
        "productDiscountClassificationsImages",
        "productDiscountClassificationsImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications",
        "productClassifications.status = :productClassifications",
        { productClassifications: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "images",
        "images.status = :images",
        { images: StatusEnum.ACTIVE }
      )
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
        "productDiscountClassifications",
        "productDiscountClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productDiscountClassifications.images",
        "productDiscountClassificationsImages",
        "productDiscountClassificationsImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications",
        "productClassifications.status = :productClassifications",
        { productClassifications: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "images",
        "images.status = :images",
        { images: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect("product.brand", "brand")
      .where("product.id = :productId", { productId })
      .getMany();

    return products;
  }

  async filterProductDiscounts(options: FilterOptions) {
    const {
      startTime,
      endTime,
      productId,
      brandId,
      status,
      sortBy,
      order,
      limit,
      page,
    } = options;

    const queryBuilder = this.repository
      .createQueryBuilder("productDiscount")
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect(
        "productDiscount.productClassifications",
        "productClassifications",
        "productClassifications.status = :status",
        { status: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "images",
        "images.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      );

    if (startTime) {
      queryBuilder.andWhere(
        'to_timestamp(productDiscount.startTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\') >= to_timestamp(:startTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\')',
        { startTime }
      );
    }

    if (endTime) {
      queryBuilder.andWhere(
        'to_timestamp(productDiscount.endTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\') <= to_timestamp(:endTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\')',
        { endTime }
      );
    }

    if (productId) {
      queryBuilder.andWhere("product.id = :productId", { productId });
    }

    if (brandId) {
      queryBuilder.andWhere("brand.id = :brandId", { brandId });
    }

    if (status) {
      queryBuilder.andWhere("productDiscount.status = :status", { status });
    }

    queryBuilder
      .orderBy(
        `productDiscount.${sortBy}`,
        order.toUpperCase() as "ASC" | "DESC"
      )
      .skip((page - 1) * limit)
      .take(limit);

    const [productDiscounts, total] = await queryBuilder.getManyAndCount();

    return {
      items: productDiscounts,
      total,
      page,
      limit,
    };
  }

  async beforeCreate(body: any) {
    const existingProduct = await productService.getById(body.product);
    if (
      !existingProduct ||
      existingProduct.status === ProductEnum.INACTIVE ||
      existingProduct.status == ProductEnum.BANNED
    ) {
      throw new BadRequestError("Product invalid.");
    }

    const classifications = body.productClassifications || [];

    const checkQuantity = classifications.filter((p) => p.quantity !== 0);

    if (checkQuantity.length === 0) {
      throw new BadRequestError(
        "Product classification must have at least one quantity."
      );
    }
    if (body.productClassifications) {
      for (const classification of body.productClassifications) {
        if (!classification.sku || classification.sku === "") {
          throw new BadRequestError("sku is required");
        }
        const checkSku = await productClassificationService.checkSkuUniqueness(
          classification.sku,
          null,
          null,
          null,
          existingProduct.brand.id
        );
        if (checkSku.length !== 0)
          throw new BadRequestError(
            `sku of classification ${classification.title} already exists`
          );
      }
    }
  }
  async beforeUpdate(id: string, body: any) {
    const productDiscount = await this.repository.findOne({ where: { id } });
    if (!productDiscount) {
      throw new BadRequestError("ProductDiscount not found");
    }

    if (body.productClassifications) {
      for (const classification of body.productClassifications) {
        if (
          (classification.sku || classification.sku !== "") &&
          !classification.id
        ) {
          const checkSku =
            await productClassificationService.checkSkuUniqueness(
              classification.sku,
              null,
              null,
              id,
              null
            );
          if (checkSku.length !== 0)
            throw new BadRequestError(
              `sku of classification ${classification.title} already exists`
            );
        }
        if (
          (classification.sku || classification.sku !== "") &&
          classification.id
        ) {
          const checkSku =
            await productClassificationService.checkSkuUniqueness(
              classification.sku,
              null,
              null,
              id,
              null
            );
          if (checkSku.length !== 0 && checkSku[0].id !== classification.id)
            throw new BadRequestError(
              `sku of classification ${classification.title} already exists`
            );
        }
      }
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
          if (!originalClassificationRecord)
            throw new BadRequestError("Original classification not found");

          if (
            originalClassificationRecord.quantity - classification.quantity <
            0
          )
            throw new BadRequestError(
              "Invalid classification quantity: Quantity should be smaller than the current stock"
            );

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
      await this.beforeUpdate(id, data);
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
