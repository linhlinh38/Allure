import { NextFunction, Request, Response } from "express";
import { roleService } from "../services/role.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class RoleController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await roleService.findAll();
      return createNormalResponse(res, "Get all roles success", roles);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await roleService.findById(req.params.id);
      if (!role) throw new NotFoundError("Role not found");
      return createNormalResponse(res, "Get role success", role);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await roleService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update role success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await roleService.create(req.body);
      return createNormalResponse(res, "Create role success");
    } catch (err) {
      next(err);
    }
  }
}
