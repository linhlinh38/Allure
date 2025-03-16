import { NextFunction, Request, Response } from 'express';
import { brandService } from '../services/brand.service';
import { plainToInstance } from 'class-transformer';
import { BrandResponse } from '../dtos/response/brand.response';
import { Brand } from '../entities/brand.entity';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { SearchDTO as SearchDTO } from '../dtos/other/search.dto';
import {
  BrandRequest,
  BrandUpdateStatusRequest,
} from '../dtos/request/brand.request';

export default class BrandController {
  static async assignInterview(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await brandService.assignInterview(
        req.params.brandId,
        req.body.reviewerId
      );
      return createNormalResponse(res, 'Assign success');
    } catch (err) {
      next(err);
    }
  }

  static async getStatusTrackings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get status trackings success',
        await brandService.getStatusTrackings(req.params.brandId)
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await brandService.findAll();
      const responseData = plainToInstance(BrandResponse, brands);
      return res
        .status(200)
        .send({ message: 'Get all brands success', data: responseData });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get brand success',
        await brandService.getById(req.params.id)
      );
    } catch (err) {
      next(err);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const searches: SearchDTO[] = req.body.filters as SearchDTO[];
      const brand: Brand[] = await brandService.search(searches);
      const responseData = plainToInstance(BrandResponse, brand);
      return createNormalResponse(res, 'Get brands success', responseData);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const brandUpdateStatusRequest = plainToInstance(
        BrandUpdateStatusRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      await brandService.updateStatus(req.loginUser, brandUpdateStatusRequest);
      return createNormalResponse(res, 'Update status success');
    } catch (err) {
      next(err);
    }
  }

  static async updateDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const brandRequest = plainToInstance(BrandRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await brandService.updateDetail(req.params.id, brandRequest);

      return createNormalResponse(res, 'Update success');
    } catch (err) {
      next(err);
    }
  }

  static async requestCreateBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const brandRequest = plainToInstance(BrandRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await brandService.requestCreateBrand(req.loginUser, brandRequest);
      return createNormalResponse(res, 'Create request success');
    } catch (err) {
      next(err);
    }
  }

  static async toggleFollowBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await brandService.toggleFollowBrand(req.loginUser, req.params.id);
      return createNormalResponse(res, 'Toggle follow success');
    } catch (err) {
      next(err);
    }
  }

  static async getFollowedBrands(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get followed brands success',
        await brandService.getFollowedBrands(req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
}
