import { ILike, In, Not } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { Product } from '../entities/product.entity';
import { ProductClassification } from '../entities/productClassification.entity';
import { BadRequestError } from '../errors/error';
import {
  BrandStatusEnum,
  FileEnum,
  PreOrderProductEnum,
  ProductDiscountEnum,
  ProductEnum,
  ProductTagEnum,
  RoleEnum,
  ShippingStatusEnum,
  StatusEnum,
} from '../utils/enum';
import { BaseService } from './base.service';
import { brandService } from './brand.service';
import { categoryService } from './category.service';
import { ProductImage } from '../entities/productImage.entity';
import { PreOrderProduct } from '../entities/preOrderProduct.entity';
import { ProductDiscount } from '../entities/productDiscount.entity';
import { File } from '../entities/file.entity';
import { Paging } from '../dtos/other/paging.dto';
import { orderDetailRepository } from '../repositories/orderDetail.repository';
import { RecommendProductsRequest } from '../dtos/request/product.request';
import { productClassificationService } from './productClassification.service';
import { productRepository } from '../repositories/product.repository';
import { productClassificationRepository } from '../repositories/productClassification.repository';
import { accountRepository } from '../repositories/account.repository';

const repository = productRepository;

interface ProductFilter {
  search?: string; // Search across multiple fields
  sortBy?: ProductTagEnum; // Field to sort by
  limit?: number; // Number of items per page
  page?: number; // Page number (for pagination)
  statuses?: ProductEnum[]; // Filter by status
  brandId?: string[]; // Filter by brand
  categoryId?: string[]; // Filter by category
  minPrice?: number; // Minimum price
  maxPrice?: number; // Maximum price
}

class ProductService extends BaseService<Product> {
  async getProducts(
    paging: Paging,
    recommendProductsRequest: RecommendProductsRequest
  ) {
    const searchCondition = recommendProductsRequest.search
      ? `AND (p.name ILIKE '%${recommendProductsRequest.search}%' OR p.sku ILIKE '%${recommendProductsRequest.search}%' OR p.description ILIKE '%${recommendProductsRequest.search}%')`
      : '';
    let orderBy = 'total_sales ASC';
    if (recommendProductsRequest.tag) {
      switch (recommendProductsRequest.tag) {
        case ProductTagEnum.BEST_SELLER:
          orderBy = 'total_sales DESC';
          break;
        case ProductTagEnum.HOT:
          orderBy = 'sales_last_30_days DESC';
          break;
        case ProductTagEnum.CREATED_DESC:
          orderBy = 'p.created_at DESC';
        case ProductTagEnum.CREATED_ASC:
          orderBy = 'p.created_at ASC';
          break;
        default:
          break;
      }
    }
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const rawTotalQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE TRUE ${searchCondition};
    `;

    const statistics = await this.retrieveStatistics(
      searchCondition,
      orderBy,
      limit,
      offset
    );
    const productIds = statistics.map((product) => product.product_id);

    const totalResult = await orderDetailRepository.query(rawTotalQuery);
    const total = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(total / paging.limit);

    const products = await this.queryGetProductAndRelations()
      .where('product.id IN (:...ids)', { ids: productIds })
      .getMany();
    const productMap = new Map(products.map((item) => [item.id, item]));
    return {
      total,
      totalPages,
      items: statistics.map((item) => {
        const product = productMap.get(item.product_id);
        return {
          ...product,
          totalSales: item.total_sales,
          salesLast30Days: item.sales_last_30_days,
          totalRatings: item.total_ratings,
          averageRating: item.average_rating,
        };
      }),
    };
  }

  constructor() {
    super(repository);
  }

  private async retrieveStatistics(
    condition: string,
    orderBy: string,
    limit: number,
    offset: number
  ) {
    const rawPagedQuery = `
      WITH product_prices AS (
        SELECT 
          p.id as product_id,
          MIN(pc.price) as min_price,
          MAX(pc.price) as max_price
        FROM products p
        LEFT JOIN product_classifications pc ON pc.product_id = p.id
        WHERE pc.status = '${StatusEnum.ACTIVE}'
        GROUP BY p.id
      )
      SELECT 
        p.id AS product_id,
        COALESCE(SUM(sales.total_quantity), 0) AS total_sales,
        COALESCE(SUM(sales.sales_last_30_days), 0) AS sales_last_30_days,
        COALESCE(SUM(sales.total_ratings), 0) AS total_ratings,
        COALESCE(AVG(sales.average_rating), 0) AS average_rating,
        pp.min_price,
        pp.max_price
      FROM products p
      LEFT JOIN product_prices pp ON pp.product_id = p.id
      LEFT JOIN (
        -- Lượt bán từ productClassification gốc
        SELECT 
          pc1.product_id, 
          SUM(od.quantity) AS total_quantity,
          SUM(CASE WHEN od.created_at >= NOW() - INTERVAL '30 days' THEN od.quantity ELSE 0 END) AS sales_last_30_days,
          COUNT(fb.id) AS total_ratings,
          AVG(fb.rating) AS average_rating
        FROM order_details od
        JOIN orders o ON od.order_id = o.id
        JOIN product_classifications pc1 ON od."product_classification_id" = pc1.id
        LEFT JOIN feedbacks fb ON fb.order_detail_id = od.id
        WHERE o.status NOT IN ('${ShippingStatusEnum.CANCELLED}', '${ShippingStatusEnum.TO_PAY}', '${ShippingStatusEnum.JOIN_GROUP_BUYING}')
        GROUP BY pc1.product_id

        UNION ALL

        -- Lượt bán từ productClassification của productDiscount
        SELECT 
          pd.product_id, 
          SUM(od.quantity) AS total_quantity,
          SUM(CASE WHEN od.created_at >= NOW() - INTERVAL '30 days' THEN od.quantity ELSE 0 END) AS sales_last_30_days,
          COUNT(fb.id) AS total_ratings,
          AVG(fb.rating) AS average_rating
        FROM order_details od
        JOIN orders o ON od.order_id = o.id
        JOIN product_classifications pc2 ON od."product_classification_id" = pc2.id
        JOIN product_discounts pd ON pc2.product_discount_id = pd.id
        LEFT JOIN feedbacks fb ON fb.order_detail_id = od.id
        WHERE o.status NOT IN ('${ShippingStatusEnum.CANCELLED}', '${ShippingStatusEnum.TO_PAY}', '${ShippingStatusEnum.JOIN_GROUP_BUYING}')
        GROUP BY pd.product_id

        UNION ALL

        -- Lượt bán từ productClassification của preProduct
        SELECT 
          pp.product_id, 
          SUM(od.quantity) AS total_quantity,
          SUM(CASE WHEN od.created_at >= NOW() - INTERVAL '30 days' THEN od.quantity ELSE 0 END) AS sales_last_30_days,
          COUNT(fb.id) AS total_ratings,
          AVG(fb.rating) AS average_rating
        FROM order_details od
        JOIN orders o ON od.order_id = o.id
        JOIN product_classifications pc3 ON od."product_classification_id" = pc3.id
        JOIN pre_order_products pp ON pc3.pre_order_product_id = pp.id
        LEFT JOIN feedbacks fb ON fb.order_detail_id = od.id
        WHERE o.status NOT IN ('${ShippingStatusEnum.CANCELLED}', '${ShippingStatusEnum.TO_PAY}', '${ShippingStatusEnum.JOIN_GROUP_BUYING}')
        GROUP BY pp.product_id
      ) AS sales ON p.id = sales.product_id
      WHERE TRUE ${condition}
      GROUP BY p.id, p.created_at, pp.min_price, pp.max_price
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset};
    `;

    const statistics = await orderDetailRepository.query(rawPagedQuery);
    return statistics;
  }

  async getAll(loginUser: string) {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .addSelect([
        'category.id',
        'category.name',
        'category.level',
        'category.status',
      ])
      .leftJoin('category.parentCategory', 'parentCategory')
      .addSelect([
        'parentCategory.id',
        'parentCategory.name',
        'parentCategory.level',
        'parentCategory.status',
      ])
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect(
        'product.productClassifications',
        'productClassifications'
      )
      .leftJoinAndSelect(
        'productClassifications.images',
        'classificationImages'
      )
      .leftJoinAndSelect('product.images', 'images')
      .where('productClassifications.status = :classificationStatus', {
        classificationStatus: StatusEnum.ACTIVE,
      })
      .andWhere('images.status = :imageStatus', {
        imageStatus: StatusEnum.ACTIVE,
      });
    if (loginUser) {
      console.log(loginUser);
      const account = await accountRepository.findOne({
        where: { id: loginUser },
        relations: {
          brands: true,
          role: true,
        },
      });
      console.log(account);

      if (
        account.role.role == RoleEnum.MANAGER ||
        account.role.role == RoleEnum.STAFF
      ) {
        const brand = account.brands[0];
        queryBuilder.andWhere('brand.id = :brandId', { brandId: brand.id });
      }
    }
    return await queryBuilder.getMany();
  }

  async getById(id: string) {
    const product = await this.queryGetProductAndRelations()
      .where('product.id = :id', { id })
      .getOne();
    if (!product) throw new BadRequestError('Product not found');

    // Get statistics using retrieveStatistics
    const statistics = await this.retrieveStatistics(
      `AND p.id = '${id}'`,
      'p.created_at DESC',
      1,
      0
    );

    const productStats = statistics[0] || {
      total_sales: 0,
      sales_last_30_days: 0,
      total_ratings: 0,
      average_rating: 0,
      min_price: 0,
      max_price: 0,
    };

    return {
      ...product,
      totalSales: productStats.total_sales,
      salesLast30Days: productStats.sales_last_30_days,
      totalRatings: productStats.total_ratings,
      averageRating: productStats.average_rating,
      minPrice: productStats.min_price,
      maxPrice: productStats.max_price,
    };
  }

  private queryGetProductAndRelations() {
    return repository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .addSelect([
        'category.id',
        'category.name',
        'category.level',
        'category.status',
      ])
      .leftJoin('category.parentCategory', 'parentCategory')
      .addSelect([
        'parentCategory.id',
        'parentCategory.name',
        'parentCategory.level',
        'parentCategory.status',
      ])
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.certificates', 'certificates')
      .leftJoinAndSelect(
        'product.productClassifications',
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
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect(
        'product.productDiscounts',
        'productDiscounts',
        'productDiscounts.status = :discountActiveStatus',
        { discountActiveStatus: ProductDiscountEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        'productDiscounts.productClassifications',
        'productDiscount_productClassifications',
        'productDiscount_productClassifications.status = :productDiscount_productClassifications',
        { productDiscount_productClassifications: ProductDiscountEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        'productDiscount_productClassifications.images',
        'productDiscount_productClassifications_images',
        'productDiscount_productClassifications_images.status = :productDiscount_productClassifications_images',
        { productDiscount_productClassifications_images: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        'product.preOrderProducts',
        'preOrderProducts',
        'preOrderProducts.status = :preOrderActiveStatus',
        { preOrderActiveStatus: PreOrderProductEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        'preOrderProducts.productClassifications',
        'preOrderProduct_productClassifications',
        'preOrderProduct_productClassifications.status = :preOrderProduct_productClassifications',
        { preOrderProduct_productClassifications: PreOrderProductEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        'preOrderProduct_productClassifications.images',
        'preOrderProduct_productClassifications_images',
        'preOrderProduct_productClassifications_images.status = :preOrderProduct_productClassifications_images',
        { preOrderProduct_productClassifications_images: StatusEnum.ACTIVE }
      );
  }

  async getByBrand(id: string) {
    const products = await this.queryGetProductAndRelations()
      .where('product.brand = :id', { id })
      .getMany();

    return products;
  }

  async getByCategory(id: string) {
    const products = await this.queryGetProductAndRelations()
      .where('product.category = :id', { id })
      .getMany();

    return products;
  }

  async filteredProducts(filter: ProductFilter): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Build base query for filtering
    const queryBuilder = this.queryGetProductAndRelations();

    if (filter.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    if (filter.statuses && filter.statuses.length > 0) {
      queryBuilder.andWhere('product.status IN (:...statuses)', {
        statuses: filter.statuses,
      });
    }

    if (filter.brandId && filter.brandId.length > 0) {
      queryBuilder.andWhere('product.brand.id IN (:...brandIds)', {
        brandIds: filter.brandId,
      });
    }

    if (filter.categoryId && filter.categoryId.length > 0) {
      queryBuilder.andWhere('product.category.id IN (:...categoryIds)', {
        categoryIds: filter.categoryId,
      });
    }

    if (filter.minPrice || filter.maxPrice) {
      const minPrice = filter.minPrice ?? 0;
      const maxPrice = filter.maxPrice ?? Number.MAX_SAFE_INTEGER;
      queryBuilder.andWhere(
        `EXISTS (
        SELECT 1
        FROM product_classifications pc
        WHERE pc.product_id = product.id
          AND pc.status = :classificationStatus
          AND pc.price BETWEEN :minPrice AND :maxPrice
      )`,
        { classificationStatus: StatusEnum.ACTIVE, minPrice, maxPrice }
      );
    }

    // Get filtered product IDs
    const filteredProducts = await queryBuilder.getMany();
    const productIds = filteredProducts.map((product) => product.id);

    if (productIds.length === 0) {
      return { items: [], total: 0, page: 1, limit: 10 };
    }

    // Build statistics query

    let orderBy = 'total_sales DESC';
    if (filter.sortBy) {
      switch (filter.sortBy.toUpperCase()) {
        case ProductTagEnum.BEST_SELLER:
          orderBy = 'total_sales DESC';
          break;
        case ProductTagEnum.HOT:
          orderBy = 'sales_last_30_days DESC';
          break;
        case ProductTagEnum.CREATED_ASC:
          orderBy = 'p.created_at ASC';
          break;
        case ProductTagEnum.CREATED_DESC:
          orderBy = 'p.created_at DESC';
          break;
        case ProductTagEnum.PRICE_ASC:
          orderBy = 'min_price ASC';
          break;
        case ProductTagEnum.PRICE_DESC:
          orderBy = 'max_price DESC';
          break;
        default:
          throw new BadRequestError('Invalid sortBy');
      }
    }

    const limit = filter.limit ?? 10;
    const offset = ((filter.page ?? 1) - 1) * limit;

    // Get statistics for filtered products
    const statistics = await this.retrieveStatistics(
      `AND p.id IN ('${productIds.join("','")}')`,
      orderBy,
      limit,
      offset
    );

    // Get detailed product information for products with statistics
    const productsWithStats = await this.queryGetProductAndRelations()
      .where('product.id IN (:...ids)', {
        ids: statistics.map((s) => s.product_id),
      })
      .getMany();

    const productMap = new Map(
      productsWithStats.map((item) => [item.id, item])
    );

    return {
      items: statistics.map((item) => {
        const product = productMap.get(item.product_id);
        return {
          ...product,
          totalSales: item.total_sales,
          salesLast30Days: item.sales_last_30_days,
          totalRatings: item.total_ratings,
          averageRating: item.average_rating,
        };
      }),
      total: productIds.length,
      page: filter.page ?? 1,
      limit: filter.limit ?? 10,
    };
  }

  async beforeCreate(body: any) {
    if (body.category) {
      const checkCategory = await categoryService.findById(body.category);
      if (!checkCategory) throw new BadRequestError('Category not found');
    }
    if (body.brand) {
      const checkBrand = await brandService.findById(body.brand);

      if (!checkBrand || checkBrand.status !== BrandStatusEnum.ACTIVE) {
        throw new BadRequestError('Brand not found');
      }
    }
    if (body.sku && body.sku !== '') {
      const checkSku = await this.repository.find({
        where: {
          brand: { id: body.brand },
          sku: body.sku,
          status: Not(In([ProductEnum.INACTIVE, ProductEnum.BANNED])),
        },
      });

      if (checkSku.length !== 0)
        throw new BadRequestError('sku already exists');
    }
    if (body.productClassifications) {
      for (const classification of body.productClassifications) {
        if (!classification.sku || classification.sku === '') {
          throw new BadRequestError('sku is required');
        }
        const checkSku = await productClassificationService.checkSkuUniqueness(
          classification.sku,
          null,
          null,
          null,
          body.brand
        );
        if (checkSku.length !== 0)
          throw new BadRequestError(
            `sku of classification ${classification.title} already exists`
          );
      }
    }
  }

  async beforeUpdate(id: string, body: any) {
    const product = await this.repository.findOne({
      where: {
        id: id,
      },
      relations: ['brand'],
    });
    if (!product) throw new BadRequestError('Product not found');

    if (body.category) {
      const checkCategory = await categoryService.findById(body.category);
      if (!checkCategory) throw new BadRequestError('Category not found');
    }
    if (body.brand) {
      const checkBrand = await brandService.findById(body.brand);
      if (!checkBrand || checkBrand.status !== BrandStatusEnum.ACTIVE)
        throw new BadRequestError('Brand not found');
    }
    if (
      body.sku &&
      body.sku !== '' &&
      body?.status !== ProductEnum.BANNED &&
      body?.status !== ProductEnum.INACTIVE &&
      product.status !== ProductEnum.BANNED &&
      product.status !== ProductEnum.INACTIVE
    ) {
      const checkSku = await this.repository.find({
        where: {
          sku: body.sku,
          id: Not(id),
          brand: { id: product.brand.id },
          status: Not(In([ProductEnum.INACTIVE, ProductEnum.BANNED])),
        },
      });
      if (checkSku.length !== 0)
        throw new BadRequestError('sku already exists');
    }

    if (
      body.status &&
      body.status !== ProductEnum.BANNED &&
      body.status !== ProductEnum.INACTIVE
    ) {
      const checkSku = await this.repository.find({
        where: {
          sku: body.sku ?? product.sku,
          id: Not(id),
          brand: { id: product.brand.id },
          status: Not(In([ProductEnum.INACTIVE, ProductEnum.BANNED])),
        },
      });

      if (checkSku.length !== 0)
        throw new BadRequestError('sku already exists');
    }

    if (body.productClassifications) {
      for (const classification of body.productClassifications) {
        if (classification.sku && !classification.id) {
          const checkSku =
            await productClassificationService.checkSkuUniqueness(
              classification.sku,
              null,
              null,
              null,
              product.brand.id
            );
          if (checkSku.length !== 0)
            throw new BadRequestError(
              `sku of classification ${classification.title} already exists`
            );
        }
        if (classification.sku && classification.id) {
          const checkSku =
            await productClassificationService.checkSkuUniqueness(
              classification.sku,
              null,
              null,
              null,
              product.brand.id
            );
          if (checkSku.length !== 0 && checkSku[0].id !== classification.id)
            throw new BadRequestError(
              `sku of classification ${classification.title} already exists`
            );
        }
        if (classification.title) {
          const checkClassificationTitle =
            await productClassificationRepository.find({
              where: {
                title: classification.title,
                product: { id: product.id },
                status: Not(In([ProductEnum.INACTIVE, ProductEnum.BANNED])),
              },
            });
          if (
            checkClassificationTitle.length !== 0 &&
            checkClassificationTitle[0].id !== classification.id
          ) {
            throw new BadRequestError(
              `title of classification ${classification.title} already exists`
            );
          }
        }
      }
    }
  }

  async createProduct(productData: Product): Promise<Product> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeCreate(productData);
      const { productClassifications, images, certificates, ...productFields } =
        productData;

      const product = await queryRunner.manager.save(Product, productFields);

      for (const classification of productData.productClassifications) {
        const { images, ...classificationFields } = classification;
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

      if (productData.images && productData.images.length > 0) {
        const productImages = productData.images.map((image) => ({
          ...image,
          product,
        }));
        await queryRunner.manager.save(ProductImage, productImages);
      }
      if (productData.certificates && productData.certificates.length > 0) {
        const certificates = productData.certificates.map((certificate) => ({
          ...certificate,
          product,
          type: FileEnum.CERTIFICATE,
        }));

        await queryRunner.manager.save(File, certificates);
      }
      await queryRunner.commitTransaction();
      return product;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProduct(
    productData: Partial<Product>,
    id: string
  ): Promise<Product> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeUpdate(id, productData);
      const productRepository = queryRunner.manager.getRepository(Product);
      const productClassificationRepository = queryRunner.manager.getRepository(
        ProductClassification
      );
      const productDiscountRepository =
        queryRunner.manager.getRepository(ProductDiscount);
      const productImageRepository =
        queryRunner.manager.getRepository(ProductImage);
      const fileRepository = queryRunner.manager.getRepository(File);

      const product = await productRepository.findOne({
        where: { id },
      });

      if (!product) {
        throw new Error('Product not found.');
      }

      if (
        productData.productClassifications &&
        productData.productClassifications.length > 0
        //    &&productData.productClassifications[0].type ===
        //     ClassificationTypeEnum.CUSTOM
      ) {
        //   await productClassificationRepository.delete({
        //     product: { id },
        //     type: ClassificationTypeEnum.DEFAULT,
        //   });

        for (const classification of productData.productClassifications) {
          const originalClassification =
            await productClassificationRepository.findOne({
              where: { id: classification.id },
            });

          const { images, ...classificationFields } = classification;
          let classificationResponse;
          if (classificationFields.id) {
            await productClassificationRepository.update(
              classificationFields.id,
              classificationFields
            );
            classificationResponse = classification;

            const productDiscounts = await productDiscountRepository.find({
              where: { product: { id } },
              relations: ['productClassifications'],
            });

            for (const discount of productDiscounts) {
              for (const discountClassification of discount.productClassifications) {
                if (
                  discountClassification.title ===
                    originalClassification.title &&
                  discountClassification.sku === originalClassification.sku
                ) {
                  const { quantity, id, ...discountUpdatableFields } =
                    classificationResponse;

                  await productClassificationRepository.update(
                    discountClassification.id,
                    discountUpdatableFields
                  );
                }
              }
            }
          } else {
            classificationResponse = await productClassificationRepository.save(
              {
                ...classificationFields,
                product,
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

      if (productData.images && productData.images.length > 0) {
        for (const image of productData.images) {
          if (image.id) {
            await productImageRepository.update(image.id, image);
          } else {
            await productImageRepository.save({
              ...image,
              product,
            });
          }
        }
      }
      if (productData.certificates && productData.certificates.length > 0) {
        for (const certificate of productData.certificates) {
          if (certificate.id) {
            await fileRepository.update(certificate.id, certificate);
          } else {
            await fileRepository.save({
              ...certificate,
              product,
              type: FileEnum.CERTIFICATE,
            });
          }
        }
      }

      const { productClassifications, images, certificates, ...productFields } =
        productData;
      await productRepository.update(id, productFields);

      await queryRunner.commitTransaction();

      const updatedProduct = await productRepository.findOne({
        where: { id },
        relations: ['productClassifications', 'images'],
      });

      return updatedProduct!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProductStatus(
    productId: string,
    status: ProductEnum
  ): Promise<Product> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productRepository = queryRunner.manager.getRepository(Product);
      const preOrderProductRepository =
        queryRunner.manager.getRepository(PreOrderProduct);
      const productDiscountRepository =
        queryRunner.manager.getRepository(ProductDiscount);
      const productClassificationRepository = queryRunner.manager.getRepository(
        ProductClassification
      );
      const product = await productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product with id ${productId} not found`);
      }
      const currentStatus = product.status;

      product.status = status;
      await productRepository.save(product);

      if (status === ProductEnum.INACTIVE || status === ProductEnum.BANNED) {
        await preOrderProductRepository.update(
          { product: { id: productId } },
          { status: PreOrderProductEnum.INACTIVE }
        );

        await productDiscountRepository.update(
          { product: { id: productId } },
          { status: ProductDiscountEnum.INACTIVE }
        );

        if (status === ProductEnum.BANNED) {
          await productClassificationRepository.update(
            { product: { id: productId } },
            { status: StatusEnum.BANNED }
          );
        } else {
          await productClassificationRepository.update(
            { product: { id: productId } },
            { status: StatusEnum.INACTIVE }
          );
        }
      }
      if (status === ProductEnum.OFFICIAL) {
        await productClassificationRepository.update(
          {
            product: { id: productId },
            status: StatusEnum.INACTIVE,
            isAvailable: true,
          },
          { status: StatusEnum.ACTIVE }
        );
      }
      if (
        currentStatus !== ProductEnum.BANNED &&
        status === ProductEnum.UN_PUBLISHED
      ) {
        await productDiscountRepository.update(
          { product: { id: productId }, status: ProductDiscountEnum.ACTIVE },
          { status: ProductDiscountEnum.INACTIVE }
        );
      }

      if (
        currentStatus === ProductEnum.BANNED &&
        status === ProductEnum.UN_PUBLISHED
      ) {
        await productClassificationRepository.update(
          {
            product: { id: productId },
            status: StatusEnum.BANNED,
            isAvailable: true,
          },
          { status: StatusEnum.ACTIVE }
        );
        await productClassificationRepository.update(
          {
            product: { id: productId },
            status: StatusEnum.BANNED,
            isAvailable: false,
          },
          { status: StatusEnum.INACTIVE }
        );
      }

      await queryRunner.commitTransaction();
      return product;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async searchProductsName(searchKey: string): Promise<string[]> {
    const products = await repository.find({
      where: {
        name: ILike(`%${searchKey}%`),
      },
      select: ['name'],
    });

    return products.map((product) => product.name);
  }
}
export const productService = new ProductService();
