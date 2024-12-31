import { NextFunction, Request, Response } from "express";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { preOrderProductService } from "../services/preOrderProduct.service";
export default class PreOrderProductController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const PreOrderProducts = await preOrderProductService.findAll();
      return createNormalResponse(
        res,
        "Get all PreOrderProducts success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getPreOrderProductActiveOfBrand(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const PreOrderProducts =
        await preOrderProductService.getPreOrderProductActiveOfBrand(
          req.params.brandId
        );
      return createNormalResponse(
        res,
        "Get all PreOrderProducts success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getPreOrderProductOfBrand(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const PreOrderProducts =
        await preOrderProductService.getPreOrderProductOfBrand(
          req.params.brandId
        );
      return createNormalResponse(
        res,
        "Get all PreOrderProducts success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getPreOrderProductOfProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const PreOrderProducts =
        await preOrderProductService.getPreOrderProductOfProduct(
          req.params.productId
        );
      return createNormalResponse(
        res,
        "Get all PreOrderProducts success",
        PreOrderProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const PreOrderProduct = await preOrderProductService.findById(
        req.params.id
      );
      if (!PreOrderProduct)
        throw new NotFoundError("PreOrderProduct not found");
      return createNormalResponse(
        res,
        "Get PreOrderProduct success",
        PreOrderProduct
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await preOrderProductService.updatePreOrderProduct(
        req.body,
        req.params.id
      );
      return createNormalResponse(res, "Update PreOrderProduct success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await preOrderProductService.create(req.body);
      return createNormalResponse(res, "Create PreOrderProduct success");
    } catch (err) {
      next(err);
    }
  }
}
