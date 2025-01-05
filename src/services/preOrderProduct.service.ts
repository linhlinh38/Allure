import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BadRequestError } from "../errors/error";
import {
  ClassificationTypeEnum,
  PreOrderProductEnum,
  ProductEnum,
  StatusEnum,
} from "../utils/enum";
import { BaseService } from "./base.service";
import { productService } from "./product.service";

const repository = AppDataSource.getRepository(PreOrderProduct);
interface FilterOptions {
  startTime?: Date;
  endTime?: Date;
  productId?: string;
  brandId?: string;
  status?: PreOrderProductEnum;
  sortBy?: string;
  order?: string;
  limit?: number;
  page?: number;
}
class PreOrderProductService extends BaseService<PreOrderProduct> {
  constructor() {
    super(repository);
  }

  async getPreOrderProductActiveOfBrand(
    brandId: string
  ): Promise<PreOrderProduct[]> {
    const products = await repository
      .createQueryBuilder("preOrderProduct")
      .leftJoinAndSelect("preOrderProduct.product", "product")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect(
        "preOrderProduct.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("productClassifications.images", "images")
      .where("preOrderProduct.status = :status", {
        status: PreOrderProductEnum.ACTIVE,
      })
      // .andWhere("product.status = :productStatus", {
      //   productStatus: ProductEnum.,
      // })
      .andWhere("brand.id = :brandId", { brandId })
      .getMany();

    return products;
  }

  async getPreOrderProductOfBrand(brandId: string): Promise<PreOrderProduct[]> {
    const products = await repository
      .createQueryBuilder("preOrderProduct")
      .leftJoinAndSelect("preOrderProduct.product", "product")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect(
        "preOrderProduct.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("productClassifications.images", "images")
      // .andWhere("product.status = :productStatus", {
      //   productStatus: ProductEnum.,
      // })
      .where("brand.id = :brandId", { brandId })
      .getMany();

    return products;
  }

  async getPreOrderProductOfProduct(
    productId: string
  ): Promise<PreOrderProduct[]> {
    const products = await repository
      .createQueryBuilder("preOrderProduct")
      .leftJoinAndSelect("preOrderProduct.product", "product")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect(
        "preOrderProduct.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("productClassifications.images", "images")
      // .andWhere("product.status = :productStatus", {
      //   productStatus: ProductEnum.,
      // })
      .where("product.id = :productId", { productId })
      .getMany();

    return products;
  }

  async filterPreOrderProducts(options: FilterOptions) {
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
      .createQueryBuilder("preOrderProduct")
      .leftJoinAndSelect("preOrderProduct.product", "product")
      .leftJoinAndSelect("product.brand", "brand");

    if (startTime) {
      queryBuilder.andWhere(
        'to_timestamp(preOrderProduct.startTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\') >= to_timestamp(:startTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\')',
        { startTime }
      );
    }

    if (endTime) {
      queryBuilder.andWhere(
        'to_timestamp(preOrderProduct.endTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\') <= to_timestamp(:endTime, \'YYYY-MM-DD"T"HH24:MI:SS"Z"\')',
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
      queryBuilder.andWhere("preOrderProduct.status = :status", { status });
    }

    queryBuilder
      .orderBy(
        `preOrderProduct.${sortBy}`,
        order.toUpperCase() as "ASC" | "DESC"
      )
      .skip((page - 1) * limit)
      .take(limit);

    const [preOrderProducts, total] = await queryBuilder.getManyAndCount();

    return {
      items: preOrderProducts,
      total,
      page,
      limit,
    };
  }

  async beforeCreate(data: PreOrderProduct) {
    const existingProduct = await productService.findById(data.product);
    if (
      !existingProduct ||
      existingProduct.status === ProductEnum.INACTIVE ||
      existingProduct.status == ProductEnum.BANNED
    ) {
      throw new BadRequestError("Product invalid.");
    }

    const preOrderClassifications = data.productClassifications || [];
    console.log(preOrderClassifications);

    const checkQuantity = preOrderClassifications.filter(
      (p) => p.quantity !== 0
    );

    if (checkQuantity.length === 0) {
      throw new BadRequestError(
        "Product classification must have at least one quantity."
      );
    }
  }

  async create(data: any): Promise<PreOrderProduct> {
    let preOrderProduct;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeCreate(data);

      if (data.productData) {
        const product = await queryRunner.manager.save(
          Product,
          data.productData
        );

        for (const classification of data.productData.productClassifications) {
          const { images, originalClassification, ...classificationFields } =
            classification;
          const classificationResponse = await queryRunner.manager.save(
            ProductClassification,
            {
              ...classificationFields,
              product,
            }
          );

          if (classification.images && classification.images.length > 0) {
            for (const image of classification.images) {
              await queryRunner.manager.save(ProductImage, {
                ...image,
                productClassification: classificationResponse,
              });
            }
          }
        }

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

        for (const classification of data.productClassifications) {
          const { images, ...classificationFields } = classification;
          const classificationResponse = await queryRunner.manager.save(
            ProductClassification,
            {
              ...classificationFields,
              preOrderProduct,
            }
          );

          if (classification.images && classification.images.length > 0) {
            for (const image of classification.images) {
              await queryRunner.manager.save(ProductImage, {
                ...image,
                productClassification: classificationResponse,
              });
            }
          }
        }
      } else {
        preOrderProduct = await queryRunner.manager.save(PreOrderProduct, data);

        for (const classification of data.productClassifications) {
          const { images, ...classificationFields } = classification;
          const classificationResponse = await queryRunner.manager.save(
            ProductClassification,
            {
              ...classificationFields,
              preOrderProduct,
            }
          );

          if (classification.images && classification.images.length > 0) {
            for (const image of classification.images) {
              await queryRunner.manager.save(ProductImage, {
                ...image,
                productClassification: classificationResponse,
              });
            }
          }
        }
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

  async updatePreOrderProduct(
    data: Partial<PreOrderProduct>,
    id: string
  ): Promise<PreOrderProduct> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const preOrderPoductRepository =
        queryRunner.manager.getRepository(PreOrderProduct);

      const productClassificationRepository = queryRunner.manager.getRepository(
        ProductClassification
      );
      const productImageRepository =
        queryRunner.manager.getRepository(ProductImage);

      const preOrderProduct = await preOrderPoductRepository.findOne({
        where: { id },
        relations: ["productClassifications", "product"],
      });

      if (!preOrderProduct) {
        throw new Error("Product not found.");
      }

      if (
        data.productClassifications &&
        data.productClassifications.length > 0
        //data.productClassifications[0].type === ClassificationTypeEnum.CUSTOM
      ) {
        // await productClassificationRepository.delete({
        //   preOrderProduct: { id },
        //   type: ClassificationTypeEnum.DEFAULT,
        // });

        for (const classification of data.productClassifications) {
          const { images, ...classificationFields } = classification;
          let classificationResponse;
          if (classificationFields.id) {
            await productClassificationRepository.update(
              classificationFields.id,
              classificationFields
            );
            classificationResponse = classification;
          } else {
            classificationResponse = await productClassificationRepository.save(
              {
                ...classificationFields,
                preOrderProduct,
              }
            );
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
      await preOrderPoductRepository.update(id, updateData);

      await queryRunner.commitTransaction();

      const updatedProduct = await preOrderPoductRepository.findOne({
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

export const preOrderProductService = new PreOrderProductService();
