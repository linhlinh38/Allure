import { Response, NextFunction } from 'express';
import { createNormalResponse } from '../utils/response';
import { plainToInstance } from 'class-transformer';
import { cardService } from '../services/card.service';
import {
  CardCreateRequest,
  CardUpdateRequest,
} from '../dtos/request/card.request';
import { AuthRequest } from '../middleware/authentication';

export default class CardController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cardData = plainToInstance(CardCreateRequest, req.body, {
        excludeExtraneousValues: true,
      });

      const card = await cardService.create(cardData, req.loginUser);
      return createNormalResponse(res, 'Card created successfully', card);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cardData = plainToInstance(CardUpdateRequest, req.body, {
        excludeExtraneousValues: true,
      });

      const card = await cardService.update(
        req.params.id,
        cardData,
        req.loginUser
      );
      return createNormalResponse(res, 'Card updated successfully', card);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await cardService.delete(req.params.id, req.loginUser);
      return createNormalResponse(res, 'Card deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const card = await cardService.getById(req.params.id, req.loginUser);
      return createNormalResponse(res, 'Get card successfully', card);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cards = await cardService.getAll(req.loginUser);
      return createNormalResponse(res, 'Get all cards successfully', cards);
    } catch (error) {
      next(error);
    }
  }
}
