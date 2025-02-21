import { NextFunction, Request, Response } from "express";
import { resultSheetService } from "../services/resultSheet.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
export default class ResultSheetController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const resultSheet = await resultSheetService.getAll();
      return createNormalResponse(
        res,
        "Get all Result Sheet success",
        resultSheet
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const resultSheet = await resultSheetService.getById(req.params.id);
      if (!resultSheet) throw new NotFoundError("resultSheet not found");
      return createNormalResponse(res, "Get Result Sheet success", resultSheet);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await resultSheetService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update Result Sheet success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await resultSheetService.create(req.body);
      return createNormalResponse(res, "Create Result Sheet success");
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, status } = req.params;
      const statusEnum = StatusEnum[status as keyof typeof StatusEnum];

      const updated = await resultSheetService.updateResultSheetStatus(
        id,
        statusEnum
      );

      return createNormalResponse(
        res,
        "Result Sheet updated successfully",
        updated
      );
    } catch (error) {
      next(error);
    }
  }
}
