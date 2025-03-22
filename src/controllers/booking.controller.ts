import { NextFunction, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { createNormalResponse } from '../utils/response';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { BookingRequest } from '../dtos/request/booking.request';
export default class BookingController {
  static async getBookingOfBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get booking of brand success',
        await bookingService.getBookingOfBrand(req.params.brandId)
      );
    } catch (err) {
      next(err);
    }
  }
  static async noteResult(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await bookingService.noteResult(
        req.params.id,
        req.body.resultNote,
        req.loginUser
      );
      return createNormalResponse(res, 'Note result success');
    } catch (err) {
      next(err);
    }
  }

  // static async assignForInterview(
  //   req: AuthRequest,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   try {
  //     await bookingService.assignForInterview(
  //       req.params.id,
  //       req.body.assigneeId
  //     );
  //     return createNormalResponse(res, 'Assign success');
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  static async getMyBookings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        'Get my bookings successfully',
        await bookingService.getMyBookings(req.loginUser)
      );
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
      await bookingService.updateStatus(req.params.id, req.body.status);
      return createNormalResponse(res, 'Update status booking success');
    } catch (err) {
      next(err);
    }
  }

  static async getSomeoneSlots(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const slots = await bookingService.getSomeoneSlots(
        req.body.startDate,
        req.body.endDate,
        req.params.accountId
      );
      return createNormalResponse(res, 'Get slots success', slots);
    } catch (err) {
      next(err);
    }
  }
  static async getStatusBookingInterview(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const status = await bookingService.getStatusBookingInterview(
        req.loginUser
      );
      return createNormalResponse(
        res,
        'Get status booking interview success',
        status
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await bookingService.findAll();
      return createNormalResponse(res, 'Get all booking success', bookings);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        'Get booking success',
        await bookingService.getById(req.params.id)
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await bookingService.update(req.params.id, req.body);
      return createNormalResponse(res, 'Update booking success');
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingRequest = plainToInstance(BookingRequest, req.body, {
        excludeExtraneousValues: true,
      });
      await bookingService.createBooking(bookingRequest, req.loginUser);
      return createNormalResponse(res, 'Create booking success');
    } catch (err) {
      next(err);
    }
  }
}
