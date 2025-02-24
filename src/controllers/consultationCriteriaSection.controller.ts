import { NextFunction, Request, Response } from "express";
import { consultationCriteriaSectionService } from "../services/consultationCriteriaSectionService.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class consultationCriteriaSectionController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const resultSheetSection =
        await consultationCriteriaSectionService.findAll();
      return createNormalResponse(
        res,
        "Get all Consultation Criteria Section Section success",
        resultSheetSection
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const resultSheetSection =
        await consultationCriteriaSectionService.findById(req.params.id);
      if (!resultSheetSection)
        throw new NotFoundError(
          "Consultation Criteria Section Section not found"
        );
      return createNormalResponse(
        res,
        "Get Consultation Criteria Section Section success",
        resultSheetSection
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await consultationCriteriaSectionService.update(req.params.id, req.body);
      return createNormalResponse(
        res,
        "Update Consultation Criteria Section Section success"
      );
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await consultationCriteriaSectionService.create(req.body);
      return createNormalResponse(
        res,
        "Create Consultation Criteria Section Section success"
      );
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await consultationCriteriaSectionService.delete(
        req.params.id as unknown as string
      );
      return res.status(204).send({
        message: "Delete Consultation Criteria Section Section success",
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }
}
