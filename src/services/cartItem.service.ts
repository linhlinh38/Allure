import { AppDataSource } from "../dataSource";
import { CartItem } from "../entities/cartItem.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(CartItem);
class CartItemService extends BaseService<CartItem> {
  constructor() {
    super(repository);
  }

  async getCartItems(account: string): Promise<CartItem[]> {
    const items = await repository
      .createQueryBuilder("cartItem")
      .leftJoinAndSelect("cartItem.productClassification", "classification")
      .leftJoinAndSelect("classification.product", "product")
      .where("cartItem.account= :account", { account })
      .getMany();
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
