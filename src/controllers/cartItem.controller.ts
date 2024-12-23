import { NextFunction, Request, Response } from "express";
import { cartItemService } from "../services/cartItem.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { AuthRequest } from "../middleware/authentication";
export default class CartItemController {
  static async getCartItemsOfCustomer(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const groupCartItemsByBrand = (cartItems) => {
        const grouped = new Map();

        cartItems.forEach((item) => {
          let brandName;
          if (item.productClassification.preOrderProduct !== null) {
            brandName =
              item.productClassification.preOrderProduct.product.brand.name;
          } else if (item.productClassification.productDiscount !== null) {
            brandName =
              item.productClassification.productDiscount.product.brand.name;
          } else {
            brandName = item.productClassification.product.brand.name;
          }

          if (!grouped.has(brandName)) {
            grouped.set(brandName, []);
          }

          grouped.get(brandName).push(item);
        });

        return Object.fromEntries(grouped);
      };

      const cartItems = await cartItemService.getCartItems(req.loginUser);
      const groupedCartItems = groupCartItemsByBrand(cartItems);
      return createNormalResponse(
        res,
        "Get all cartItems success",
        groupedCartItems
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const cartItem = await cartItemService.findById(req.params.id);
      if (!cartItem) throw new NotFoundError("cartItem not found");
      return createNormalResponse(res, "Get cartItem success", cartItem);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await cartItemService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update cartItem success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const account = req.loginUser;
      const { data, isExisted } = await cartItemService.checkCart({
        ...req.body,
        account,
      });
      if (isExisted) {
        await cartItemService.update(data.id, { quantity: data.quantity });
      } else {
        await cartItemService.create(data);
      }

      return createNormalResponse(res, "Create cartItem success");
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await cartItemService.delete(req.params.id);
      return createNormalResponse(res, "Delete cartItem success");
    } catch (err) {
      next(err);
    }
  }

  static async removeMultipleItems(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await cartItemService.removeItems(req.body.itemIds);
      return createNormalResponse(res, "Delete cartItems success");
    } catch (err) {
      next(err);
    }
  }

  static async removeAllCart(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await cartItemService.removeAllCart(req.loginUser);
      return createNormalResponse(res, "Delete all cartItems success");
    } catch (err) {
      next(err);
    }
  }
}
