import { NextFunction, Request, Response } from "express";
import { productDiscountService } from "../services/productDiscount.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class ProductDiscountController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const productDiscounts = await productDiscountService.getAll();
      return createNormalResponse(
        res,
        "Get all Product Discounts success",
        productDiscounts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getProductDiscountActiveOfBrand(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const PreOrderProducts =
        await productDiscountService.getProductDiscountActiveOfBrand(
          req.params.brandId
        );
      return createNormalResponse(
        res,
        "Get all Product Discount success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getProductDiscountOfBrand(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const PreOrderProducts =
        await productDiscountService.getProductDiscountOfBrand(
          req.params.brandId
        );
      return createNormalResponse(
        res,
        "Get all Product Discount success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getProductDiscountOfProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const PreOrderProducts =
        await productDiscountService.getProductDiscountOfProduct(
          req.params.productId
        );
      return createNormalResponse(
        res,
        "Get all Product Discount success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const productDiscount = await productDiscountService.findById(
        req.params.id
      );
      if (!productDiscount)
        throw new NotFoundError("Product Discount not found");
      return createNormalResponse(
        res,
        "Get Product Discount success",
        productDiscount
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await productDiscountService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update Product Discount success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await productDiscountService.create(req.body);
      return createNormalResponse(res, "Create Product Discount success");
    } catch (err) {
      next(err);
    }
  }
}
