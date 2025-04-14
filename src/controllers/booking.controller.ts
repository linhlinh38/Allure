import { NextFunction, Request, Response } from "express";
import { bookingService } from "../services/booking.service";
import { createNormalResponse } from "../utils/response";
import { AuthRequest } from "../middleware/authentication";
import { plainToInstance } from "class-transformer";
import { BookingRequest } from "../dtos/request/booking.request";
import { BookingStatusEnum, ServiceTypeEnum } from "../utils/enum";
import { Booking } from "../entities/booking.entity";
export default class BookingController {
  static async getBookingOfBrand(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      return createNormalResponse(
        res,
        "Get booking of brand success",
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
      return createNormalResponse(res, "Note result success");
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
        "Get my bookings successfully",
        await bookingService.getMyBookings(req.loginUser)
      );
    } catch (err) {
      next(err);
    }
  }

  static async filterBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        consultantServiceId,
        consultantAccountId,
        systemServiceType,
        statuses,
        minTotalPrice,
        maxTotalPrice,
        feedbackRating,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "ASC",
      } = req.query;

      const filters = {
        consultantServiceId: consultantServiceId as string,
        consultantAccountId: consultantAccountId as string,
        systemServiceType: systemServiceType as ServiceTypeEnum,
        status: statuses
          ? ((statuses as string).split(",") as BookingStatusEnum[])
          : undefined,
        minTotalPrice: minTotalPrice ? Number(minTotalPrice) : undefined,
        maxTotalPrice: maxTotalPrice ? Number(maxTotalPrice) : undefined,
        feedbackRating: feedbackRating ? Number(feedbackRating) : undefined,
      };

      const paging = {
        page: Number(page),
        limit: Number(limit),
      };

      const result = await bookingService.filterBookings(
        filters,
        paging,
        sortBy as keyof Booking,
        order as "ASC" | "DESC"
      );

      res.status(200).json({
        message: "Filter bookings success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async calculateRevenueByConsultant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { consultantId, startTime, endTime } = req.query;

      if (!consultantId || !startTime || !endTime) {
        return res.status(400).send({
          message: "Consultant ID, start time, and end time are required.",
        });
      }

      const revenue = await bookingService.calculateRevenueByConsultant(
        consultantId as string,
        startTime as string,
        endTime as string
      );

      return res.status(200).send({
        message: "Revenue calculated successfully",
        data: { revenue },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await bookingService.updateStatus(req.params.id, req.body.status);
      return createNormalResponse(res, "Update status booking success");
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
      return createNormalResponse(res, "Get slots success", slots);
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
        "Get status booking interview success",
        status
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await bookingService.findAll();
      return createNormalResponse(res, "Get all booking success", bookings);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      return createNormalResponse(
        res,
        "Get booking success",
        await bookingService.getById(req.params.id)
      );
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await bookingService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update booking success");
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
      return createNormalResponse(res, "Create booking success");
    } catch (err) {
      next(err);
    }
  }

  static async cancelledBooking(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await bookingService.cancelBooking(
        req.params.id,
        req.loginUser,
        req.body.reason
      );
      return createNormalResponse(res, "Cancelled booking done");
    } catch (err) {
      next(err);
    }
  }

  static async updateBookingStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await bookingService.updateBookingServiceStatus(
        req.params.id,
        req.body,
        req.loginUser
      );
      return createNormalResponse(res, "Update booking done");
    } catch (err) {
      next(err);
    }
  }
}
