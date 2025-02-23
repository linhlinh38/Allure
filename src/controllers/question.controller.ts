import { NextFunction, Request, Response } from "express";
import { questionService } from "../services/question.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class ServiceBookingFormController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const question = await questionService.findAll();
      return createNormalResponse(res, "Get all question success", question);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const question = await questionService.findById(req.params.id);
      if (!question) throw new NotFoundError("question not found");
      return createNormalResponse(res, "Get question success", question);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await questionService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update question success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await questionService.create(req.body);
      return createNormalResponse(res, "Create question success");
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await questionService.delete(
        req.params.id as unknown as string
      );
      return res.status(204).send({
        message: "Delete question success",
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }
}
