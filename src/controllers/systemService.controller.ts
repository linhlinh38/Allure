import { NextFunction, Request, Response } from "express";
import { systemServiceService } from "../services/systemService.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class SystemServiceController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const services = await systemServiceService.getAll();
      return createNormalResponse(res, "Get all services success", services);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await systemServiceService.getById(req.params.id);
      if (!service) throw new NotFoundError("service not found");
      return createNormalResponse(res, "Get service success", service);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await systemServiceService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update service success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await systemServiceService.create(req.body);
      return createNormalResponse(res, "Create service success");
    } catch (err) {
      next(err);
    }
  }
}
