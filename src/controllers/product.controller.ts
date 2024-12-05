import { NextFunction, Request, Response } from "express";
import { productService } from "../services/product.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class ProductController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getAll();
      return createNormalResponse(res, "Get all product success", products);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getById(req.params.id);
      if (!product) throw new NotFoundError("product not found");
      return createNormalResponse(res, "Get product success", product);
    } catch (err) {
      next(err);
    }
  }

  static async getByBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getByBrand(req.params.id);
      if (!product) throw new NotFoundError("product not found");
      return createNormalResponse(res, "Get product success", product);
    } catch (err) {
      next(err);
    }
  }

  static async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getByCategory(req.params.id);
      if (!product) throw new NotFoundError("product not found");
      return createNormalResponse(res, "Get product success", product);
    } catch (err) {
      next(err);
    }
  }

  static async searchBy(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.findBy(
        req.params.value,
        req.params.option
      );
      return createNormalResponse(res, "Get product success", products);
    } catch (err) {
      next(err);
    }
  }

  static async searchProductsName(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const products = await productService.searchProductsName(
        req.params.searchKey
      );
      return createNormalResponse(res, "Get product name success", products);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.updateProduct(req.body, req.params.id);
      return createNormalResponse(res, "Update product success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.createProduct(req.body);
      return createNormalResponse(res, "Create product success");
    } catch (err) {
      next(err);
    }
  }
}
