import { ILike } from "typeorm";
import { AppDataSource } from "../dataSource";
import { Product } from "../entities/product.entity";
import { ProductClassification } from "../entities/productClassification.entity";
import { BadRequestError } from "../errors/error";
import { ClassificationTypeEnum, ProductEnum, StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { brandService } from "./brand.service";
import { categoryService } from "./category.service";
import { ProductImage } from "../entities/productImage.entity";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";

const repository = AppDataSource.getRepository(Product);
class ProductService extends BaseService<Product> {
  constructor() {
    super(repository);
  }

  async getAll() {
    const product = await repository.find({
      relations: ["category", "brand", "productClassifications", "images"],
    });

    return product;
  }
  async getById(id: string) {
    const product = await repository.find({
      where: { id },
      relations: ["category", "brand", "productClassifications", "images"],
    });

    return product;
  }

  async getByBrand(id: string) {
    const product = await repository.find({
      where: { brand: { id } },
      relations: ["category", "brand", "productClassifications", "images"],
    });

    return product;
  }

  async getByCategory(id: string) {
    const product = await repository.find({
      where: { category: { id } },
      relations: ["category", "brand", "productClassifications", "images"],
    });

    return product;
  }

  async beforeCreate(body: Product) {
    if (body.category) {
      const checkCategory = await categoryService.findById(body.category);
      if (!checkCategory) throw new BadRequestError("Category not found");
    }
    if (body.brand) {
      const checkBrand = await brandService.findById(body.brand);
      if (!checkBrand || checkBrand.status !== StatusEnum.ACTIVE)
        throw new BadRequestError("Brand not found");
    }
  }

  async createProduct(productData: Product): Promise<Product> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeCreate(productData);

      const product = await queryRunner.manager.save(Product, productData);

      let productClassification: ProductClassification[] = [];

      const classificationsWithProduct = productData.productClassifications.map(
        (classification) => ({
          ...classification,
          product,
        })
      );
      productClassification = await queryRunner.manager.save(
        ProductClassification,
        classificationsWithProduct
      );

      let images: ProductImage[] = [];
      if (productData.images && productData.images.length > 0) {
        const productImages = productData.images.map((image) => ({
          ...image,
          product,
        }));
        images = await queryRunner.manager.save(ProductImage, productImages);
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
      const productRepository = queryRunner.manager.getRepository(Product);
      const productClassificationRepository = queryRunner.manager.getRepository(
        ProductClassification
      );
      const productImageRepository =
        queryRunner.manager.getRepository(ProductImage);

      const product = await productRepository.findOne({
        where: { id },
        relations: ["productClassifications", "images"],
      });

      if (!product) {
        throw new Error("Product not found.");
      }

      if (
        productData.productClassifications &&
        productData.productClassifications.length > 0 &&
        productData.productClassifications[0].type ===
          ClassificationTypeEnum.CUSTOM
      ) {
        await productClassificationRepository.delete({
          product: { id },
          type: ClassificationTypeEnum.DEFAULT,
        });

        for (const classification of productData.productClassifications) {
          if (classification.id) {
            await productClassificationRepository.update(
              classification.id,
              classification
            );
          } else {
            await productClassificationRepository.save({
              ...classification,
              product,
            });
          }
        }
      }

      if (productData.images && productData.images.length > 0) {
        const productImages = productData.images.map((image) => ({
          ...image,
          product,
        }));
        await productImageRepository.save(productImages);
      }

      const { productClassifications, images, ...productFields } = productData;
      await productRepository.update(id, productFields);

      await queryRunner.commitTransaction();

      const updatedProduct = await productRepository.findOne({
        where: { id },
        relations: ["productClassifications", "images"],
      });

      return updatedProduct!;
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
      select: ["name"],
    });

    return products.map((product) => product.name);
  }
}
export const productService = new ProductService();
