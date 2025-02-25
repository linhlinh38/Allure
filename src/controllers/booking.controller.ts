import { NextFunction, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { createNormalResponse } from '../utils/response';
import { NotFoundError } from '../errors/error';
import { AuthRequest } from '../middleware/authentication';
import { plainToInstance } from 'class-transformer';
import { BookingRequest } from '../dtos/request/booking.request';
import { BookingStatusEnum } from '../utils/enum';
export default class BookingController {
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

  static async getAvailableSlotsForInterview(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const slots = await bookingService.getAvailableSlotsForInterview(
        req.body.startDate,
        req.body.endDate
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
      const booking = await bookingService.findById(req.params.id);
      if (!booking) throw new NotFoundError('booking not found');
      return createNormalResponse(res, 'Get booking success', booking);
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
