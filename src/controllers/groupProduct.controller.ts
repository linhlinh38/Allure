import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { groupProductService } from '../services/groupProduct.service';
import { plainToInstance, plainToClass } from 'class-transformer';
import {
  GroupProductCreateRequest,
  GroupProductUpdateRequest,
  FilterGroupProductRequest,
  FilterGroupProductPaging,
} from '../dtos/request/groupProduct.request';
import { GroupBuyingRequest } from '../dtos/request/groupBuying.request';
import { AuthRequest } from '../middleware/authentication';
import { StatusEnum } from '../utils/enum';

export default class GroupProductController {
  static async getByBrand(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get groups by brand success',
        await groupProductService.getByBrand(
          req.params.brandId,
          req.body.status
        )
      );
    } catch (err) {
      next(err);
    }
  }
  static async getBrandsHaveGroupProducts(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get groups by brand success',
        await groupProductService.getBrandsHaveGroupProducts()
      );
    } catch (err) {
      next(err);
    }
  }
  static async getByStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get group by status success',
        await groupProductService.getByStatus(req.body.status)
      );
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get group success',
        await groupProductService.getById(req.params.groupProductId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async toggleStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const statusAfterUpdate = await groupProductService.toggleStatus(
        req.params.groupProductId
      );
      return createNormalResponse(
        res,
        statusAfterUpdate == StatusEnum.ACTIVE
          ? 'Status is active'
          : 'Status is inactive'
      );
    } catch (err) {
      next(err);
    }
  }

  static async startEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const groupBuyingBody = plainToInstance(GroupBuyingRequest, req.body, {
        excludeExtraneousValues: true,
      });
      const newGroupBuying = await groupProductService.startEvent(
        groupBuyingBody,
        req.loginUser
      );
      return createNormalResponse(res, 'Start event success', newGroupBuying);
    } catch (err) {
      next(err);
    }
  }

  static async isInAnyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const isInAnyEvents: boolean = await groupProductService.isInAnyEvents(
        req.params.groupProductId
      );
      if (isInAnyEvents)
        return createNormalResponse(res, 'It is in events', true);
      return createNormalResponse(res, 'It is not in any events', false);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const groupProductUpdateBody = plainToInstance(
        GroupProductUpdateRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      await groupProductService.updateGroup(
        groupProductUpdateBody,
        req.params.groupProductId
      );
      return createNormalResponse(res, 'Update success');
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const groupProducts = await groupProductService.getAll();
      return createNormalResponse(
        res,
        'Get all group products success',
        groupProducts
      );
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const groupProductBody = plainToInstance(
        GroupProductCreateRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Create group product success',
        await groupProductService.createGroupProduct(groupProductBody)
      );
    } catch (err) {
      next(err);
    }
  }

  static async filter(req: Request, res: Response, next: NextFunction) {
    try {
      const filterRequest = plainToClass(FilterGroupProductRequest, req.body);

      // Set default values for paging
      const paging = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      } as FilterGroupProductPaging;

      const result = await groupProductService.filter(filterRequest, paging);
      return createNormalResponse(
        res,
        'Filter group products successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  }
}
