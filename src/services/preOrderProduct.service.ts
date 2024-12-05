import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductClassification } from "../entities/productClassification.entity";
import { ProductImage } from "../entities/productImage.entity";
import { BadRequestError } from "../errors/error";
import { ClassificationTypeEnum, ProductEnum, StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { productService } from "./product.service";

const repository = AppDataSource.getRepository(PreOrderProduct);
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
      .where("preOrderProduct.status = :status", { status: StatusEnum.ACTIVE })
      // .andWhere("product.status = :productStatus", {
      //   productStatus: ProductEnum.,
      // })
      .andWhere("brand.id = :brandId", { brandId })
      .getMany();

    return products;
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

        const classificationsWithPreOrderPoduct =
          data.productClassifications.map((classification) => ({
            ...classification,
            preOrderProduct,
          }));

        await queryRunner.manager.save(
          ProductClassification,
          classificationsWithPreOrderPoduct
        );
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
      const preOrderProduct = await preOrderPoductRepository.findOne({
        where: { id },
        relations: ["productClassifications", "product"],
      });

      if (!preOrderProduct) {
        throw new Error("Product not found.");
      }

      if (
        data.productClassifications &&
        data.productClassifications.length > 0 &&
        data.productClassifications[0].type === ClassificationTypeEnum.CUSTOM
      ) {
        await productClassificationRepository.delete({
          preOrderProduct: { id },
          type: ClassificationTypeEnum.DEFAULT,
        });

        for (const classification of data.productClassifications) {
          if (classification.id) {
            await productClassificationRepository.update(
              classification.id,
              classification
            );
          } else {
            await productClassificationRepository.save({
              ...classification,
              preOrderProduct,
            });
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
