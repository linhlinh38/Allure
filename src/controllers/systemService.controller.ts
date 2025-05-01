import { NextFunction, Request, Response } from "express";
import { systemServiceService } from "../services/systemService.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
import { SystemService } from "../entities/systemService.entity";
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
      if (!service) throw new NotFoundError("System service not found.");
      return createNormalResponse(res, "Get service success", service);
    } catch (err) {
      next(err);
    }
  }

  static async filterSystemServices(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        name,
        description,
        categoryId,
        statuses,
        sortBy,
        order,
        page,
        limit,
      } = req.query;
      const filteredServices = await systemServiceService.filterSystemServices(
        name?.toString(),
        description?.toString(),
        categoryId?.toString(),
        statuses
          ? ((statuses as string).split(",") as StatusEnum[])
          : undefined,
        (sortBy?.toString() as keyof SystemService) ?? "id",
        order?.toString() ?? "ASC",
        page ? Number(page) : 1,
        limit ? Number(limit) : 10
      );
      return createNormalResponse(res, "Get service success", filteredServices);
    } catch (error) {
      next(error);
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

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, status } = req.params;
      if (!Object.values(StatusEnum).includes(status as StatusEnum)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      const statusEnum = StatusEnum[status as keyof typeof StatusEnum];
      await systemServiceService.updateStatus(req.params.id, statusEnum);
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
