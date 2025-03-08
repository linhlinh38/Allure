import { NextFunction, Request, Response } from "express";
import { consultantServiceService } from "../services/consultantService.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { AuthRequest } from "../middleware/authentication";
import { StatusEnum } from "../utils/enum";
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
