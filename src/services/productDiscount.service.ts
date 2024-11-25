import { AppDataSource } from "../dataSource";
import { ProductDiscount } from "../entities/productDiscount.entity";
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
      .leftJoinAndSelect("productDiscount.product", "product")
      .leftJoinAndSelect(
        "product.productClassifications",
        "productClassifications"
      )
      .leftJoinAndSelect("product.brand", "brand")
      .where("productDiscount.status = :status", { status: StatusEnum.ACTIVE })
      .andWhere("product.status = :productStatus", {
        productStatus: ProductEnum.OFFICIAL,
      })
      .andWhere("brand.id = :brandId", { brandId })
      .getMany();

    return products;
  }

  async beforeCreate(data: ProductDiscount) {
    const existingProduct = await productService.findById(data.product);
    if (!existingProduct) {
      throw new BadRequestError("Product does not exist.");
    }
  }
}
export const productDiscountService = new ProductDiscountService();
