import { NextFunction, Request, Response } from "express";
import { categoryService } from "../services/category.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
import { Category } from "../entities/category.entity";
export default class CategoryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categorys = await categoryService.getAll();
      return createNormalResponse(res, "Get all Category success", categorys);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.getById(req.params.id);
      if (!category) throw new NotFoundError("Category not found");
      return createNormalResponse(res, "Get Category success", category);
    } catch (err) {
      next(err);
    }
  }

  static async filterCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        name,
        level,
        parentCategoryId,
        statuses,
        sortBy,
        order,
        page,
        limit,
      } = req.query;

      // Construct the filter object
      const filter = {
        name: name?.toString(),
        level: level ? parseInt(level as string, 10) : undefined,
        parentCategoryId: parentCategoryId?.toString(),
        statuses: statuses
          ? (statuses as string)
              .split(",")
              .map((status) => status as StatusEnum)
          : undefined,
        sortBy: sortBy?.toString() as keyof Category,
        order: (order?.toString().toUpperCase() as "ASC" | "DESC") || "ASC",
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      };

      // Call the service method
      const result = await categoryService.filterCategories(filter);

      // Return the response
      return res.status(200).json({
        message: "Categories filtered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update Category success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.create(req.body);
      return createNormalResponse(res, "Create Category success");
    } catch (err) {
      next(err);
    }
  }
}
