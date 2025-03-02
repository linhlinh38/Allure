import { NextFunction, Request, Response } from 'express';
import { createNormalResponse } from '../utils/response';
import { plainToInstance } from 'class-transformer';
import {
  CreateReportRequest,
  FilterReportsRequest,
} from '../dtos/request/report.request';
import { reportService } from '../services/report.service';
import { AuthRequest } from '../middleware/authentication';
import { ReportStatusEnum } from '../utils/enum';
export default class ReportController {
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await reportService.getById(
        req.params.id,
      );
      return createNormalResponse(res, 'Get report success');
    } catch (err) {
      next(err);
    }
  }
  static async noteResult(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await reportService.noteResult(
        req.params.id,
        req.body.resultNote as string,
        req.loginUser
      );
      return createNormalResponse(res, 'Note result success');
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
      await reportService.updateStatus(
        req.params.id,
        req.body.status as ReportStatusEnum
      );
      return createNormalResponse(res, 'Update report status success');
    } catch (err) {
      next(err);
    }
  }
  static async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await reportService.assign(req.params.id, req.body.assigneeId);
      return createNormalResponse(res, 'Assign report success');
    } catch (err) {
      next(err);
    }
  }
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const createReportRequest = plainToInstance(
        CreateReportRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Create report success',
        await reportService.createReport(createReportRequest, req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }
  static async filterReports(req: Request, res: Response, next: NextFunction) {
    try {
      const filterReportsRequest = plainToInstance(
        FilterReportsRequest,
        req.body,
        {
          excludeExtraneousValues: true,
        }
      );
      return createNormalResponse(
        res,
        'Filter reports success',
        await reportService.filterReports(filterReportsRequest)
      );
    } catch (err) {
      next(err);
    }
  }
}
