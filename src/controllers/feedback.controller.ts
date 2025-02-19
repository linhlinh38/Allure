import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { FeedbackCreateRequest, FeedbackFilterRequest } from '../dtos/request/feedback.request';
import { feedbackService } from '../services/feedback.service';
export default class FeedbackController {
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get feedback success',
        await feedbackService.getById(req.params.id)
      );
    } catch (err) {
      next(err);
    }
  }
  static async reply(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Reply feedback success',
        await feedbackService.reply(
          req.body.content,
          req.params.feedbackId,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async filter(req: Request, res: Response, next: NextFunction) {
    try {
      const feedbackFilterRequest = plainToInstance(
        FeedbackFilterRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Filter feedbacks success',
        await feedbackService.filter(
          feedbackFilterRequest,
          req.params.productId
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async reviewGeneralOfProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Review general of products success',
        await feedbackService.reviewGeneralOfProduct(req.params.productId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async getMyFeedbacks(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Create feedback success',
        await feedbackService.getMyFeedbacks(req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const feedbackCreateRequest = plainToInstance(
        FeedbackCreateRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Create feedback success',
        await feedbackService.createFeedback(
          feedbackCreateRequest,
          req.loginUser
        )
      );
    } catch (err) {
      next(err);
    }
  }
}
