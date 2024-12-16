import { NextFunction, Request, Response } from "express";
import { masterConfigService } from "../services/masterConfig.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class MasterConfigController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const masterConfigs = await masterConfigService.findAll();
      return createNormalResponse(
        res,
        "Get all masterConfigs success",
        masterConfigs
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const masterConfig = await masterConfigService.findById(req.params.id);
      if (!masterConfig) throw new NotFoundError("masterConfig not found");
      return createNormalResponse(
        res,
        "Get masterConfig success",
        masterConfig
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await masterConfigService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update masterConfig success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await masterConfigService.create(req.body);
      return createNormalResponse(res, "Create masterConfig success");
    } catch (err) {
      next(err);
    }
  }
}
