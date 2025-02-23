import { NextFunction, Request, Response } from "express";
import { resultSheetSectionService } from "../services/resultSheetSection.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
export default class resultSheetSectionController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const resultSheetSection = await resultSheetSectionService.findAll();
      return createNormalResponse(
        res,
        "Get all Result Sheet Section success",
        resultSheetSection
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const resultSheetSection = await resultSheetSectionService.findById(
        req.params.id
      );
      if (!resultSheetSection)
        throw new NotFoundError("Result Sheet Section not found");
      return createNormalResponse(
        res,
        "Get Result Sheet Section success",
        resultSheetSection
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await resultSheetSectionService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update Result Sheet Section success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await resultSheetSectionService.create(req.body);
      return createNormalResponse(res, "Create Result Sheet Section success");
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await resultSheetSectionService.delete(
        req.params.id as unknown as string
      );
      return res
        .status(204)
        .send({
          message: "Delete Result Sheet Section success",
          data: account,
        });
    } catch (error) {
      next(error);
    }
  }
}
