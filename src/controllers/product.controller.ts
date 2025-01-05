import { NextFunction, Request, Response } from "express";
import { productService } from "../services/product.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { Product } from "../entities/product.entity";
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

  static async filterProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        brandId,
        categoryId,
        status,
        sortBy,
        order,
        page,
        limit,
      } = req.query;

      // Construct the filter object
      const filter = {
        search: search?.toString(),
        brandId: brandId?.toString(),
        categoryId: categoryId?.toString(),
        status: status?.toString(),
        sortBy: (sortBy?.toString() as keyof Product) ?? "id",
        order: order?.toString() ?? "ASC",
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      };

      const product = await productService.filteredProducts(filter);
      return createNormalResponse(res, "Get products success", product);
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

  static async updateProductStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await productService.updateProductStatus(req.params.id, req.body.status);
      return createNormalResponse(res, "Update product success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(req.body);
      return createNormalResponse(res, "Create product success", {
        id: product.id,
      });
    } catch (err) {
      next(err);
    }
  }
}
