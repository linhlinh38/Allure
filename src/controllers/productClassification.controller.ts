import { NextFunction, Request, Response } from "express";
import { productClassificationService } from "../services/productClassification.service";
import { createNormalResponse } from "../utils/response";
import { BadRequestError, NotFoundError } from "../errors/error";
export default class ProductClassificationController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const productClassifications =
        await productClassificationService.findAll();
      return createNormalResponse(
        res,
        "Get all Product Classifications success",
        productClassifications
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const productClassification = await productClassificationService.findById(
        req.params.id
      );
      if (!productClassification)
        throw new NotFoundError("Product Classification not found");
      return createNormalResponse(
        res,
        "Get Product Classification success",
        productClassification
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.body.title) {
        throw new BadRequestError("cannot update product title");
      }
      await productClassificationService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update Product Classification success");
    } catch (err) {
      next(err);
    }
  }

  static async updateClassificationTitle(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await productClassificationService.updateClassificationTitle(
        req.body.newClassification,
        req.body.oldClassificationId
      );
      return createNormalResponse(res, "Update Product Classification success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await productClassificationService.create(req.body);
      return createNormalResponse(res, "Create Product Classification success");
    } catch (err) {
      next(err);
    }
  }
}
