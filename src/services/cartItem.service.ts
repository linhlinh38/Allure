import { AppDataSource } from "../dataSource";
import { CartItem } from "../entities/cartItem.entity";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
import { BadRequestError } from "../errors/error";
import { ProductDiscountEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { productClassificationService } from "./productClassification.service";

const repository = AppDataSource.getRepository(CartItem);
class CartItemService extends BaseService<CartItem> {
  constructor() {
    super(repository);
  }

  async beforeCreate(body: any) {
    if (body.productClassification) {
      const checkClassification = await productClassificationService.findById(
        body.productClassification
      );
      if (!checkClassification)
        throw new BadRequestError("Classification not found");
    }
  }

  async beforeUpdate(id: string, body: any) {
    const checkCart = await cartItemService.findById(id);
    if (!checkCart) throw new BadRequestError("Cart Item not found");
    if (body.productClassification) {
      const checkClassification = await productClassificationService.findById(
        body.productClassification
      );
      if (!checkClassification)
        throw new BadRequestError("Classification not found");
    }
  }

  async getCartItems(account: string): Promise<CartItem[]> {
    const items = await repository.find({
      where: { account: { id: account } },
      relations: [
        "productClassification",
        "productClassification.images",
        "productClassification.product",
        "productClassification.preOrderProduct",
        "productClassification.productDiscount",
      ],
      order: {
        createdAt: "DESC",
      },
    });

    await Promise.all(
      items.map(async (item) => {
        const product = item.productClassification.product;
        const preOrderProduct = item.productClassification.preOrderProduct;
        const productDiscount = item.productClassification.productDiscount;
        if (product) {
          const fullProduct = await repository.manager
            .createQueryBuilder(Product, "product")
            .leftJoinAndSelect("product.brand", "brand")
            .leftJoinAndSelect(
              "product.productClassifications",
              "productClassifications"
            )
            .leftJoinAndSelect("productClassifications.images", "images")
            .leftJoinAndSelect(
              "product.productDiscounts",
              "productDiscounts",
              "productDiscounts.status = :status",
              { status: ProductDiscountEnum.ACTIVE }
            )
            .leftJoinAndSelect(
              "productDiscounts.productClassifications",
              "productDiscounts_productClassifications"
            )
            .leftJoinAndSelect(
              "productDiscounts_productClassifications.images",
              "productDiscounts_images"
            )
            .where("product.id = :id", { id: product.id })
            .getOne();

          if (fullProduct && fullProduct.brand) {
            item.productClassification.product = fullProduct;
          }
        } else if (preOrderProduct) {
          const fullPreOrderProduct = await repository.manager.findOne(
            PreOrderProduct,
            {
              where: { id: preOrderProduct.id },
              relations: [
                "product",
                "productClassifications",
                "productClassifications.images",
                "product.brand",
                "product.productClassifications",
              ],
            }
          );

          if (fullPreOrderProduct && fullPreOrderProduct.product.brand) {
            item.productClassification.preOrderProduct = fullPreOrderProduct;
          }
        } else if (productDiscount) {
          const fullproductDiscount = await repository.manager.findOne(
            ProductDiscount,
            {
              where: { id: productDiscount.id },
              relations: [
                "product",
                "product.brand",
                "productClassifications",
                "productClassifications.images",
                "product.productClassifications",
              ],
            }
          );
          if (fullproductDiscount && fullproductDiscount.product.brand) {
            item.productClassification.productDiscount = fullproductDiscount;
          }
        }
      })
    );
    return items;
  }

  async checkCart(body: CartItem) {
    let isExisted = false;
    let data = body;
    const check = await repository
      .createQueryBuilder("cartItem")
      .where("cartItem.account_id = :accountId", { accountId: body.account })
      .andWhere("cartItem.product_classification_id = :classification", {
        classification: body.productClassification,
      })
      .getMany();
    if (check.length !== 0) {
      data = check[0];
      data.quantity += body.quantity;
      isExisted = true;
    }
    return { data, isExisted };
  }

  async removeItems(itemIds: string[]) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error("Invalid or empty itemIds array");
    }

    const itemList = await Promise.all(
      itemIds.map(async (item) => {
        const itemToRemove = await this.repository.findOne({
          where: { id: item },
        });
        if (!itemToRemove) {
          throw new Error("No items found for the provided IDs");
        }
        return itemToRemove;
      })
    );

    await this.repository.delete(itemIds);
  }

  async removeAllCart(accountId: string): Promise<void> {
    if (!accountId) {
      throw new Error("Account ID is required");
    }

    const itemsToClear = await this.repository.find({
      where: { account: { id: accountId } },
    });

    if (itemsToClear.length === 0) {
      throw new Error("No items found in the cart for the given account");
    }

    await this.repository.delete({ account: { id: accountId } });
  }
}
export const cartItemService = new CartItemService();
