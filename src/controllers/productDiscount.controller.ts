import { NextFunction, Request, Response } from "express";
import { productDiscountService } from "../services/productDiscount.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { ProductDiscountEnum } from "../utils/enum";
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

  static async filterProductDiscounts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        startTime,
        endTime,
        productId,
        brandId,
        status,
        sortBy,
        order,
        limit,
        page,
      } = req.query;

      const filter = {
        startTime: startTime ? new Date(startTime.toString()) : undefined,
        endTime: endTime ? new Date(endTime.toString()) : undefined,
        productId: productId?.toString(),
        brandId: brandId?.toString(),
        status: status ? (status as ProductDiscountEnum) : undefined,
        sortBy: sortBy?.toString() ?? "id",
        order: order?.toString() ?? "ASC",
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      };

      const productDiscount =
        await productDiscountService.filterProductDiscounts(filter);
      return createNormalResponse(
        res,
        "Get productDiscount success",
        productDiscount
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const productDiscount = await productDiscountService.getById(
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
      const productDiscount = await productDiscountService.create(req.body);
      return createNormalResponse(res, "Create Product Discount success", {
        id: productDiscount.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
