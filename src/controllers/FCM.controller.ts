import { NextFunction, Response } from 'express';
import { FCMService } from '../services/FCM.service';
import { AuthRequest } from '../middleware/authentication';
import { createNormalResponse } from '../utils/response';

export class FCMController {
  static async getToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const token = await FCMService.getToken(req.loginUser);
      return createNormalResponse(res, 'Get token success', token);
    } catch (error) {
      next(error);
    }
  }

  static async createToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token } = req.body;
      await FCMService.createToken(req.loginUser, token);
      return createNormalResponse(res, 'Create token success');
    } catch (error) {
      next(error);
    }
  }

  static async testNotification(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await FCMService.sendTestNotification(req.loginUser);
      return createNormalResponse(
        res,
        'Test notification sent successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  }
}
