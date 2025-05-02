import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BadRequestError } from "../errors/error";
import { accountRepository } from "../repositories/account.repository";
import { preOrderProductRepository } from "../repositories/preOrderProduct.repository";
import { productDiscountRepository } from "../repositories/productDiscount.repository";
import {
  PreOrderProductEnum,
  ProductDiscountEnum,
  ProductEnum,
  RoleEnum,
  StatusEnum,
} from "../utils/enum";
import { BaseService } from "./base.service";
import { productService } from "./product.service";
import { productClassificationService } from "./productClassification.service";
import { format } from "date-fns";

const repository = AppDataSource.getRepository(PreOrderProduct);
interface FilterOptions {
  startTime?: Date;
  endTime?: Date;
  productIds?: string[];
  brandId?: string;
  status?: PreOrderProductEnum[];
  sortBy?: string;
  order?: string;
  limit?: number;
  page?: number;
}
class PreOrderProductService extends BaseService<PreOrderProduct> {
  constructor() {
    super(repository);
  }

  async getAll(loginUser: string) {
    const query = this.repository
      .createQueryBuilder("preOrderProduct")
      .leftJoinAndSelect("preOrderProduct.product", "product")
      .leftJoinAndSelect(
        "preOrderProduct.productClassifications",
        "productClassifications",
        "productClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "productClassifications.images",
        "classificationImages",
        "classificationImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      );
    if (loginUser) {
      const account = await accountRepository.findOne({
        where: { id: loginUser },
        relations: {
          brands: true,
          role: true,
        },
      });
      if (
        account.role.role == RoleEnum.MANAGER ||
        account.role.role == RoleEnum.STAFF
      ) {
        const brand = account.brands[0];
        query.where("product.brand_id = :brandId", { brandId: brand.id });
      }
    }
    return await query.getMany();
  }

  async getById(id: string) {
    const preOrderProduct = await this.repository
      .createQueryBuilder('preOrderProduct')
      .leftJoinAndSelect('preOrderProduct.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect(
        'preOrderProduct.productClassifications',
        'productClassifications',
        'productClassifications.status = :classificationStatus',
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        'productClassifications.images',
        'classificationImages',
        'classificationImages.status = :imageStatus',
        { imageStatus: StatusEnum.ACTIVE }
      )
      .where('preOrderProduct.id = :id', { id })
      .getOne();

    return preOrderProduct;
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
        "preOrderProductClassifications",
        "preOrderProductClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "preOrderProductClassifications.images",
        "preOrderProductClassificationsImages",
        "preOrderProductClassificationsImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
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
        "preOrderProductClassifications",
        "preOrderProductClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "preOrderProductClassifications.images",
        "preOrderProductClassificationsImages",
        "preOrderProductClassificationsImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
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
        "preOrderProductClassifications",
        "preOrderProductClassifications.status = :classificationStatus",
        { classificationStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "preOrderProductClassifications.images",
        "preOrderProductClassificationsImages",
        "preOrderProductClassificationsImages.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      // .andWhere("product.status = :productStatus", {
      //   productStatus: ProductEnum.,
      // })
      .where("product.id = :productId", { productId })
      .getMany();

    return products;
  }

  async filterPreOrderProducts(options: FilterOptions, loginUser: string) {
    const {
      startTime,
      endTime,
      productIds,
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
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect(
        "product.images",
        "images_product",
        "images_product.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "preOrderProduct.productClassifications",
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

    if (productIds && productIds.length > 0) {
      queryBuilder.andWhere("preOrderProduct.product.id IN (:...productIds)", {
        productIds,
      });
    }
    if (loginUser) {
      const account = await accountRepository.findOne({
        where: { id: loginUser },
        relations: {
          role: true,
          brands: true,
        },
      });
      if (
        account.role.role == RoleEnum.MANAGER ||
        account.role.role == RoleEnum.STAFF
      ) {
        const brand = account.brands[0];
        queryBuilder.andWhere('brand.id = :brandId', { brandId: brand.id });
      }
    } else if (brandId) {
      queryBuilder.andWhere("brand.id = :brandId", { brandId });
    }

    if (status && status.length > 0) {
      queryBuilder.andWhere("preOrderProduct.status IN (:...statuses)", {
        statuses: status,
      });
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

  async formatDatetime(datetimeString: string): Promise<string> {
    const date = new Date(datetimeString);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid datetime string");
    }

    return format(date, "yyyy-MM-dd'T'HH:mm:ss");
  }

  async beforeCreate(data: any) {
    const existingProduct = await productService.getById(data.product);
    if (
      !existingProduct ||
      existingProduct.status === ProductEnum.INACTIVE ||
      existingProduct.status == ProductEnum.BANNED
    ) {
      throw new BadRequestError(
        `Product invalid: Product ${existingProduct?.status ?? 'not found'}`
      );
    }

    const preOrderClassifications = data.productClassifications || [];

    const checkQuantity = preOrderClassifications.filter(
      (p) => p.quantity !== 0
    );

    if (checkQuantity.length === 0) {
      throw new BadRequestError(
        "Product classification must have at least one quantity."
      );
    }

    if (data.productClassifications) {
      for (const classification of data.productClassifications) {
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
    if (data.startTime) {
      const formattedStartTime = await this.formatDatetime(data.startTime);
      data.startTime = formattedStartTime;
    }
    if (data.endTime) {
      const formattedEndTime = await this.formatDatetime(data.endTime);
      data.endTime = formattedEndTime;
    }

    if (data.startTime || data.endTime) {
      await this.validateEventTimeRange(
        data.product,
        data.startTime,
        data.endTime
      );
    }
  }

  async validateEventTimeRange(
    productId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ): Promise<void> {
    const preOrderRepository = preOrderProductRepository;
    const discountRepository = productDiscountRepository;

    // Convert startTime and endTime to Date objects for comparison
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError("Invalid start time or end time");
    }

    if (start >= end) {
      throw new BadRequestError("Start time must be earlier than end time");
    }

    // Check for overlapping pre-order events
    const overlappingPreOrder = await preOrderRepository
      .createQueryBuilder("preOrderProduct")
      .leftJoin("preOrderProduct.product", "product")
      .where("product.id = :productId", { productId })
      .andWhere(
        `(
        (preOrderProduct.startTime <= :endTime AND preOrderProduct.endTime >= :startTime) OR
        (preOrderProduct.startTime >= :startTime AND preOrderProduct.endTime <= :endTime) OR
        (preOrderProduct.startTime <= :startTime AND preOrderProduct.endTime >= :endTime)
      )`,
        { startTime, endTime }
      )
      .andWhere(
        excludeEventId ? "preOrderProduct.id != :excludeEventId" : "1=1",
        { excludeEventId }
      )
      .andWhere("preOrderProduct.status IN (:...statuses)", {
        statuses: [
          PreOrderProductEnum.ACTIVE,
          PreOrderProductEnum.WAITING,
          PreOrderProductEnum.SOLD_OUT,
        ],
      })
      .getOne();

    if (overlappingPreOrder) {
      throw new BadRequestError(
        "The time range overlaps with an existing pre-order event"
      );
    }

    // Check for overlapping discount events
    const overlappingDiscount = await discountRepository
      .createQueryBuilder("productDiscount")
      .leftJoin("productDiscount.product", "product")
      .where("product.id = :productId", { productId })
      .andWhere(
        `(
        (productDiscount.startTime <= :endTime AND productDiscount.endTime >= :startTime) OR
        (productDiscount.startTime >= :startTime AND productDiscount.endTime <= :endTime) OR
        (productDiscount.startTime <= :startTime AND productDiscount.endTime >= :endTime)
      )`,
        { startTime, endTime }
      )
      .andWhere(
        excludeEventId ? "productDiscount.id != :excludeEventId" : "1=1",
        { excludeEventId }
      )
      .andWhere("productDiscount.status IN (:...statuses)", {
        statuses: [
          ProductDiscountEnum.ACTIVE,
          ProductDiscountEnum.WAITING,
          ProductDiscountEnum.SOLD_OUT,
        ],
      })
      .getOne();

    if (overlappingDiscount) {
      throw new BadRequestError(
        "The time range overlaps with an existing discount event"
      );
    }
  }

  async beforeUpdate(id: string, body: any) {
    const preorderProduct = await this.repository.findOne({
      where: { id },
      relations: ["product"],
    });
    if (!preorderProduct) {
      throw new BadRequestError("Pre-order Product not found");
    }
    if (body.productClassifications) {
      for (const classification of body.productClassifications) {
        if (classification.sku && !classification.id) {
          const checkSku =
            await productClassificationService.checkSkuUniqueness(
              classification.sku,
              null,
              id,
              null,
              null
            );
          if (checkSku.length !== 0)
            throw new BadRequestError("sku of classification already exists");
        }
        if (classification.sku && classification.id) {
          const checkSku =
            await productClassificationService.checkSkuUniqueness(
              classification.sku,
              null,
              id,
              null,
              null
            );

          if (checkSku.length !== 0 && checkSku[0].id !== classification.id)
            throw new BadRequestError("sku of classification already exists");
        }
      }
    }
    if (body.startTime) {
      const formattedStartTime = await this.formatDatetime(body.startTime);
      body.startTime = formattedStartTime;
    }
    if (body.endTime) {
      const formattedEndTime = await this.formatDatetime(body.endTime);
      body.endTime = formattedEndTime;
    }
    if (body.startTime || body.endTime) {
      await this.validateEventTimeRange(
        preorderProduct.product.id,
        body.startTime ?? preorderProduct.startTime,
        body.endTime ?? preorderProduct.endTime,
        id
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
      await this.beforeUpdate(id, data);
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
