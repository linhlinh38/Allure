import { NextFunction, Request, Response } from 'express';
import { brandService } from '../services/brand.service';
import { plainToClass, plainToInstance } from 'class-transformer';
import { BrandResponse } from '../dtos/response/brand.response';
import { Brand } from '../entities/brand.entity';
import { AppDataSource } from '../dataSource';
import { createBadResponse, createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { SearchDTO as SearchDTO } from '../dtos/other/search.dto';
import { BrandUpdateStatusRequest } from '../dtos/request/brand.request';

export default class BrandController {
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
      const brand: Brand = await brandService.findById(req.params.id);
      const responseData = plainToClass(BrandResponse, brand);
      if (!responseData) return createBadResponse(res, 'Brand not found!');
      return createNormalResponse(res, 'Get brand success', responseData);
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
      const brand: Brand = await brandService.findById(req.params.id);
      if (!brand) return createBadResponse(res, 'No brand found');
      await brandService.update(brand.id, { status: req.body.status });
      return createNormalResponse(res, 'Update status success');
    } catch (err) {
      next(err);
    }
  }

  static async updateDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const brandBody = plainToInstance(Brand, req.body, {
        excludeExtraneousValues: true,
      });
      await brandService.updateDetail(req.params.id, brandBody);

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
      const brandBody = plainToInstance(Brand, req.body, {
        excludeExtraneousValues: true,
      });
      await brandService.requestCreateBrand(req.loginUser, brandBody);
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
