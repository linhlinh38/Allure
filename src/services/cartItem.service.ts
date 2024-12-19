import { AppDataSource } from "../dataSource";
import { CartItem } from "../entities/cartItem.entity";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
import { BadRequestError } from "../errors/error";
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
        "productClassification.product",
        "productClassification.preOrderProduct",
        "productClassification.productDiscount",
      ],
    });

    await Promise.all(
      items.map(async (item) => {
        const product = item.productClassification.product;
        const preOrderProduct = item.productClassification.preOrderProduct;
        const productDiscount = item.productClassification.productDiscount;
        if (product) {
          const fullProduct = await repository.manager.findOne(Product, {
            where: { id: product.id },
            relations: ["brand"],
          });
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
}
export const cartItemService = new CartItemService();
