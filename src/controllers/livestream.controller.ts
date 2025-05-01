import { NextFunction, Request, Response } from "express";
import { livestreamService } from "../services/livestream.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { AuthRequest } from "../middleware/authentication";
export default class livestreamController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const livestreams = await livestreamService.findAll();
      return createNormalResponse(
        res,
        "Get all livestreams success",
        livestreams
      );
    } catch (err) {
      next(err);
    }
  }

  static async getActiveLiveStreams(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const livestreams = await livestreamService.getActiveLiveStreams();
      return createNormalResponse(
        res,
        "Get all livestreams success",
        livestreams
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const livestream = await livestreamService.findById(req.params.id);
      if (!livestream) throw new NotFoundError("Livestream not found");
      return createNormalResponse(res, "Get livestream success", livestream);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await livestreamService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update livestream success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await livestreamService.create(req.body);
      return createNormalResponse(res, "Create livestream success");
    } catch (err) {
      next(err);
    }
  }
  static async createTokenLiveStream(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const token = await livestreamService.livestreamToken(
        req.body,
        req.loginUser
      );
      return createNormalResponse(res, "Token Generated", token);
    } catch (err) {
      next(err);
    }
  }
}
