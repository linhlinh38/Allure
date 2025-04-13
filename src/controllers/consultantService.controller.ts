import { NextFunction, Request, Response } from "express";
import { consultantServiceService } from "../services/consultantService.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { AuthRequest } from "../middleware/authentication";
import { ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { ConsultantService } from "../entities/consultantService.entity";
export default class ConsultantServiceController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const services = await consultantServiceService.getAll();
      return createNormalResponse(res, "Get all services success", services);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await consultantServiceService.getById(req.params.id);
      if (!service) throw new NotFoundError("service not found");
      return createNormalResponse(res, "Get service success", service);
    } catch (err) {
      next(err);
    }
  }

  static async getByConsultant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const service = await consultantServiceService.getAllServiceOfConsultant(
        req.params.id
      );
      if (!service) throw new NotFoundError("service not found");
      return createNormalResponse(res, "Get service success", service);
    } catch (err) {
      next(err);
    }
  }

  static async filterConsultantServices(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        price,
        accountIds,
        systemServiceId,
        types,
        statuses,
        sortBy,
        order,
        page,
        limit,
      } = req.query;

      // Construct the filter object
      const filter = {
        price: price ? Number(price) : undefined,
        accountIds: accountIds ? (accountIds as string).split(",") : undefined,
        systemServiceId: systemServiceId?.toString(),
        types: types
          ? ((types as string).split(",") as ServiceTypeEnum[])
          : undefined,
        statuses: statuses
          ? ((statuses as string).split(",") as StatusEnum[])
          : undefined,
        sortBy: (sortBy?.toString() as keyof ConsultantService) ?? "id",
        order: order?.toString() ?? "ASC",
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      };
      const consultantServices =
        await consultantServiceService.filterConsultantServices(
          filter.price,
          filter.accountIds,
          filter.systemServiceId,
          filter.types,
          filter.statuses,
          filter.sortBy,
          filter.order as "ASC" | "DESC",
          filter.page,
          filter.limit
        );
      res.status(200).json(consultantServices);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await consultantServiceService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update service success");
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.body.status;

      if (!Object.values(StatusEnum).includes(status as StatusEnum)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      const statusEnum = StatusEnum[status as keyof typeof StatusEnum];
      await consultantServiceService.updateStatus(req.params.id, statusEnum);
      return createNormalResponse(res, "Update service success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      data.account = req.loginUser;
      await consultantServiceService.create(data);
      return createNormalResponse(res, "Create service success");
    } catch (err) {
      next(err);
    }
  }
}
