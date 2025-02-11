import { Request, Response, NextFunction } from 'express';
import { createNormalResponse } from '../utils/response';
import { slotService } from '../services/slot.service';
import { plainToInstance } from 'class-transformer';
import {
  SlotRequest,
  UpdateWorkingSlotRequest,
} from '../dtos/request/slot.request';
import { AuthRequest } from '../middleware/authentication';

export default class SlotController {
  static async getWorkingSlotsOfConsultant(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get working slots of consultant success',
        await slotService.getWorkingSlotsOfConsultant(req.params.accountId)
      );
    } catch (err) {
      next(err);
    }
  }

  static async updateWorkingSlot(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    const updateWorkingSlotRequest = plainToInstance(
      UpdateWorkingSlotRequest,
      req.body,
      {
        excludeExtraneousValues: true,
      }
    );
    await slotService.updateWorkingSlot(
      updateWorkingSlotRequest,
      req.loginUser
    );
    try {
      return createNormalResponse(res, 'Update working slots success');
    } catch (err) {
      next(err);
    }
  }

  static async bulkCreate(req: Request, res: Response, next: NextFunction) {
    const slotsRequest = plainToInstance(SlotRequest, req.body, {
      excludeExtraneousValues: true,
    });
    await slotService.bulkCreate(slotsRequest);
    try {
      return createNormalResponse(res, 'Create slots success');
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get all slots success',
        await slotService.getAll()
      );
    } catch (err) {
      next(err);
    }
  }
}
