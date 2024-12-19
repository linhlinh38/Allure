import { NextFunction, Request, Response } from "express";
import { addressService } from "../services/address.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { AuthRequest } from "../middleware/authentication";
export default class AddressController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await addressService.findAll();
      return createNormalResponse(res, "Get all address success", address);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await addressService.findById(req.params.id);
      if (!address) throw new NotFoundError("address not found");
      return createNormalResponse(res, "Get address success", address);
    } catch (err) {
      next(err);
    }
  }

  static async getMyAddress(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const address = await addressService.getMyAddress(req.loginUser);
      if (!address) throw new NotFoundError("address not found");
      return createNormalResponse(res, "Get address success", address);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await addressService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update address success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      await addressService.create(req.body);
      return createNormalResponse(res, "Create address success");
    } catch (err) {
      next(err);
    }
  }
}
