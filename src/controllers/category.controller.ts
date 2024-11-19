import { NextFunction, Request, Response } from "express";
import { categoryService } from "../services/category.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
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
      console.log(req.body);

      await categoryService.create(req.body);
      return createNormalResponse(res, "Create Category success");
    } catch (err) {
      next(err);
    }
  }
}
