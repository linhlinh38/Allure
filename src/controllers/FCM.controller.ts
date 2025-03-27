import { NextFunction, Response } from 'express';
import { FCMService } from '../services/FCM.service';
import { AuthRequest } from '../middleware/authentication';
import { createNormalResponse } from '../utils/response';
import { fcmTokenRepository } from '../repositories/fcmToken.repository';
import { accountRepository } from '../repositories/account.repository';
import { BadRequestError } from '../errors/error';
import Logging from '../utils/Logging';

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
      // Get account information
      const account = await accountRepository.findOne({
        where: { id: req.loginUser },
      });

      if (!account) {
        throw new BadRequestError('Account not found');
      }

      // Get FCM token
      const fcmToken = await fcmTokenRepository.findOne({
        where: { account: { id: req.loginUser } },
      });

      if (!fcmToken) {
        throw new BadRequestError('FCM token not found for this account');
      }

      // Send test notification
      await FCMService.sendNotification(
        fcmToken.token,
        'Test Notification',
        `Hello ${account.firstName}, this is a test notification!`,
        {
          type: 'TEST',
          message: 'This is a test notification from the API',
        }
      );

      Logging.info(
        `Test notification sent successfully to account ${account.id}`
      );

      return createNormalResponse(res, 'Test notification sent successfully', {
        accountId: account.id,
        accountName: account.firstName,
        notificationSent: true,
      });
    } catch (error) {
      Logging.error('Error sending test notification:');
      Logging.error(error);
      next(error);
    }
  }
}
