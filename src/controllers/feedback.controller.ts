import { Request, Response, NextFunction } from 'express';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance, plainToClass } from 'class-transformer';
import {
  FeedbackCreateForBookingRequest,
  FeedbackCreateRequest,
  FeedbackFilterRequest,
  FilterConsultantFeedbackRequest,
} from '../dtos/request/feedback.request';
import { feedbackService } from '../services/feedback.service';
import { Paging } from '../dtos/other/paging.dto';

export default class FeedbackController {
  static async getConsultantFeedbacks(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get consultant feedbacks success',
        await feedbackService.getConsultantFeedbacks(req.params.consultantId)
      );
    } catch (err) {
      next(err);
    }
  }
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
      const paging = {
        page: Number(req.query.page) ? Number(req.query.page) : 1,
        limit: Number(req.query.limit) ? Number(req.query.limit) : 10,
      } as Paging;
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
          req.params.productId,
          paging
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

  static async createForBooking(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const feedbackCreateForBookingRequest = plainToInstance(
        FeedbackCreateForBookingRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Create feedback success',
        await feedbackService.createFeedbackForBooking(
          feedbackCreateForBookingRequest,
          req.loginUser
        )
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

  static async filterConsultantFeedbacks(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const consultantId = req.params.consultantId;
      const filterRequest = plainToClass(
        FilterConsultantFeedbackRequest,
        req.body
      );

      // Set default values for paging
      const paging = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      } as Paging;

      const result = await feedbackService.filterConsultantFeedbacks(
        consultantId,
        filterRequest,
        paging
      );

      return createNormalResponse(
        res,
        'Get consultant feedbacks successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  }
}
