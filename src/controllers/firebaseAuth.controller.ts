import { NextFunction, Request, Response } from 'express';
import { firebaseAuthService } from '../services/firebaseAuth.service';
import { BadRequestError } from '../errors/error';
import { AuthRequest } from '../middleware/authentication';
import { createNormalResponse } from '../utils/response';

export class FirebaseAuthController {
  static async generateToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(res, 'Generate token success', {
        token: await firebaseAuthService.generateCustomToken(req.loginUser),
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyToken(req: Request, res: Response) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        throw new BadRequestError('Missing ID token');
      }

      const decodedToken = await firebaseAuthService.verifyIdToken(idToken);

      return res.json({
        success: true,
        data: {
          decodedToken,
        },
      });
    } catch (error) {
      console.error('Error in verifyToken:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
