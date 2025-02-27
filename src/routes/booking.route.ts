import express from 'express';
import authentication from '../middleware/authentication';
import BookingController from '../controllers/booking.controller';
import validate from '../utils/validate';
import {
  BookingCreateSchema,
  BookingUpdateStatusSchema,
  GetAvailableSlotsSchema,
} from '../dtos/request/booking.request';
const bookingRoute = express.Router();

bookingRoute.use(authentication);
bookingRoute.get('/', BookingController.getAll);
bookingRoute.post('/', validate(BookingCreateSchema), BookingController.create);
bookingRoute.put('/:id', BookingController.update);
bookingRoute.put(
  '/:id',
  validate(BookingUpdateStatusSchema),
  BookingController.updateStatus
);
bookingRoute.put(
  '/update-status/:id',
  validate(BookingUpdateStatusSchema),
  BookingController.updateStatus
);
bookingRoute.get(
  '/get-status-booking-interview',
  BookingController.getStatusBookingInterview
);
bookingRoute.post(
  '/get-available-slots-for-interview',
  validate(GetAvailableSlotsSchema),
  BookingController.getAvailableSlotsForInterview
);
export default bookingRoute;
