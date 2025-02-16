import { AppDataSource } from "../dataSource";
import { CartItem } from "../entities/cartItem.entity";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { Product } from "../entities/product.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
import { BadRequestError } from "../errors/error";
import { ProductDiscountEnum, StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { groupBuyingService } from "./groupBuying.service";
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

      if (
        checkClassification.quantity <= 0 ||
        checkClassification.status !== StatusEnum.ACTIVE
      ) {
        throw new BadRequestError("Can not add invalid Product");
      }

      if (checkClassification.quantity < body.quantity) {
        throw new BadRequestError("Quantity is not enough");
      }
    }
    if (body.groupBuying) {
      const checkGroupBuying = await groupBuyingService.getById(
        body.groupBuying
      );
      if (!checkGroupBuying || checkGroupBuying.status === StatusEnum.INACTIVE)
        throw new BadRequestError("Group Buying invalid");
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
    const items = await repository
      .createQueryBuilder("cartItem")
      .leftJoinAndSelect(
        "cartItem.productClassification",
        "productClassification"
      )
      .leftJoinAndSelect("cartItem.groupBuying", "groupBuying")
      .leftJoinAndSelect(
        "productClassification.images",
        "images",
        "images.status = :status",
        { status: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect("productClassification.product", "product")
      .leftJoinAndSelect(
        "productClassification.preOrderProduct",
        "preOrderProduct"
      )
      .leftJoinAndSelect(
        "productClassification.productDiscount",
        "productDiscount"
      )
      .where("cartItem.account_id = :accountId", { accountId: account })
      .orderBy("cartItem.createdAt", "DESC")
      .getMany();

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
              "product.images",
              "productImages",
              "productImages.status = :productImageStatus",
              { productImageStatus: StatusEnum.ACTIVE }
            )
            .leftJoinAndSelect(
              "product.productClassifications",
              "productClassifications"
            )
            .leftJoinAndSelect(
              "productClassifications.images",
              "images",
              "images.status = :imagesStatus",
              { imagesStatus: StatusEnum.ACTIVE }
            )
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
              "productDiscounts_images",
              "productDiscounts_images.status = :imagesStatus",
              { imagesStatus: StatusEnum.ACTIVE }
            )
            .where("product.id = :id", { id: product.id })
            .getOne();

          if (fullProduct && fullProduct.brand) {
            item.productClassification.product = fullProduct;
          }
        } else if (preOrderProduct) {
          const fullPreOrderProduct = await repository.manager
            .createQueryBuilder(PreOrderProduct, "preOrderProduct")
            .leftJoinAndSelect("preOrderProduct.product", "product")
            .leftJoinAndSelect(
              "preOrderProduct.productClassifications",
              "productClassifications"
            )
            .leftJoinAndSelect(
              "productClassifications.images",
              "images",
              "images.status = :status",
              { status: StatusEnum.ACTIVE }
            )
            .leftJoinAndSelect("product.brand", "brand")
            .leftJoinAndSelect(
              "product.images",
              "productImages",
              "productImages.status = :status",
              { status: StatusEnum.ACTIVE }
            )
            .leftJoinAndSelect(
              "product.productClassifications",
              "product_productClassifications"
            )
            .where("preOrderProduct.id = :preOrderProductId", {
              preOrderProductId: preOrderProduct.id,
            })
            .getOne();

          if (fullPreOrderProduct && fullPreOrderProduct.product.brand) {
            item.productClassification.preOrderProduct = fullPreOrderProduct;
          }
        } else if (productDiscount) {
          const fullProductDiscount = await repository.manager
            .createQueryBuilder(ProductDiscount, "productDiscount")
            .leftJoinAndSelect("productDiscount.product", "product")
            .leftJoinAndSelect(
              "productDiscount.productClassifications",
              "productClassifications"
            )
            .leftJoinAndSelect(
              "productClassifications.images",
              "images",
              "images.status = :status",
              { status: StatusEnum.ACTIVE }
            )
            .leftJoinAndSelect("product.brand", "brand")
            .leftJoinAndSelect(
              "product.images",
              "productImages",
              "productImages.status = :status",
              { status: StatusEnum.ACTIVE }
            )
            .leftJoinAndSelect(
              "product.productClassifications",
              "product_productClassifications"
            )
            .where("productDiscount.id = :productDiscountId", {
              productDiscountId: productDiscount.id,
            })
            .getOne();
          if (fullProductDiscount && fullProductDiscount.product.brand) {
            item.productClassification.productDiscount = fullProductDiscount;
          }
        }
      })
    );
    return items;
  }

  async checkCart(body: CartItem) {
    let isExisted = false;
    let data = body;
    const queryBuilder = await repository
      .createQueryBuilder("cartItem")
      .where("cartItem.account_id = :accountId", { accountId: body.account })
      .andWhere("cartItem.product_classification_id = :classification", {
        classification: body.productClassification,
      });

    if (body.groupBuying) {
      queryBuilder.andWhere("cartItem.group_buying_id = :groupBuyingId", {
        groupBuyingId: body.groupBuying,
      });
    }
    const check = await queryBuilder.getMany();

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
