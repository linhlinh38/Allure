import { NextFunction, Request, Response } from "express";
import { consultationCriteriaService } from "../services/consultationCriteria.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
export default class ConsultationCriteriaController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const consultationCriteria = await consultationCriteriaService.getAll();
      return createNormalResponse(
        res,
        "Get all Consultation Criteria success",
        consultationCriteria
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const consultationCriteria = await consultationCriteriaService.getById(
        req.params.id
      );
      if (!consultationCriteria)
        throw new NotFoundError("consultationCriteria not found");
      return createNormalResponse(
        res,
        "Get Consultation Criteria success",
        consultationCriteria
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await consultationCriteriaService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update Consultation Criteria success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await consultationCriteriaService.create(req.body);
      return createNormalResponse(res, "Create Consultation Criteria success");
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

      const updated =
        await consultationCriteriaService.updateConsultationCriteriaStatus(
          id,
          statusEnum
        );

      return createNormalResponse(
        res,
        "Consultation Criteria updated successfully",
        updated
      );
    } catch (error) {
      next(error);
    }
  }
}
