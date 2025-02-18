import { NextFunction, Request, Response } from "express";
import { serviceBookingFormService } from "../services/serviceBookingForm.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class ServiceBookingFormController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceBookingForm = await serviceBookingFormService.getAll();
      return createNormalResponse(
        res,
        "Get all serviceBookingForm success",
        serviceBookingForm
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceBookingForm = await serviceBookingFormService.getById(
        req.params.id
      );
      if (!serviceBookingForm) throw new NotFoundError("form not found");
      return createNormalResponse(res, "Get form success", serviceBookingForm);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await serviceBookingFormService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update form success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await serviceBookingFormService.create(req.body);
      return createNormalResponse(res, "Create form success");
    } catch (err) {
      next(err);
    }
  }
}
