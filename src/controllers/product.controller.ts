import { NextFunction, Request, Response } from "express";
import { productService } from "../services/product.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { Paging } from "../dtos/other/paging.dto";
import { plainToInstance } from "class-transformer";
import { RecommendProductsRequest } from "../dtos/request/product.request";
import { ProductEnum, ProductTagEnum } from "../utils/enum";
import { AuthRequest } from "../middleware/authentication";
export default class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    const paging = {
      page: Number(req.query.page) ? Number(req.query.page) : 1,
      limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
    } as Paging;
    try {
      const recommendProductsRequest = plainToInstance(
        RecommendProductsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        "Get products success",
        await productService.getProducts(paging, recommendProductsRequest)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const products = await productService.getAll(req.loginUser);
      return createNormalResponse(res, "Get all product success", products);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getById(req.params.id);

      return createNormalResponse(res, "Get product success", product);
    } catch (err) {
      next(err);
    }
  }

  static async getByBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getByBrand(req.params.id);
      if (!product) throw new NotFoundError("Product not found");
      return createNormalResponse(res, "Get product success", product);
    } catch (err) {
      next(err);
    }
  }

  static async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getByCategory(req.params.id);
      if (!product) throw new NotFoundError("Product not found");
      return createNormalResponse(res, "Get product success", product);
    } catch (err) {
      next(err);
    }
  }

  static async filterProduct(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        search,
        brandId,
        categoryId,
        maxPrice,
        minPrice,
        statuses,
        sortBy,
        order,
        page,
        limit,
      } = req.query;
      const min = minPrice ? Number(minPrice) : undefined;
      const max = maxPrice ? Number(maxPrice) : undefined;

      if (minPrice !== undefined && isNaN(min)) {
        return res.status(400).send({
          message: "minPrice must be a valid number",
        });
      }

      if (maxPrice !== undefined && isNaN(max)) {
        return res.status(400).send({
          message: "maxPrice must be a valid number",
        });
      }
      if (min !== undefined && min < 0) {
        return res.status(400).send({
          message: "minPrice must be a positive number",
        });
      }

      if (max !== undefined && max < 0) {
        return res.status(400).send({
          message: "maxPrice must be a positive number",
        });
      }

      if (min !== undefined && max !== undefined && min > max) {
        return res.status(400).send({
          message: "minPrice must be less than maxPrice",
        });
      }
      // Construct the filter object
      const filter = {
        search: search?.toString(),
        brandId: brandId
          ? ((brandId as string).split(",") as string[])
          : undefined,
        categoryId: categoryId
          ? ((categoryId as string).split(",") as string[])
          : undefined,
        statuses: statuses
          ? ((statuses as string).split(",") as ProductEnum[])
          : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        sortBy: sortBy as ProductTagEnum,
        order: order?.toString() ?? "ASC",
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      };

      return createNormalResponse(
        res,
        "Get products success",
        await productService.filteredProducts(filter, req?.loginUser)
      );
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
