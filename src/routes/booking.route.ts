import express from "express";
import authentication from "../middleware/authentication";
import BookingController from "../controllers/booking.controller";
import validate from "../utils/validate";
import {
  BookingCreateSchema,
  BookingUpdateStatusSchema,
  GetSomeoneSlotsSchema,
  NoteResultSchema,
} from "../dtos/request/booking.request";
const bookingRoute = express.Router();

bookingRoute.use(authentication);
bookingRoute.get("/", BookingController.getAll);
bookingRoute.get("/get-by-id/:id", BookingController.getById);
bookingRoute.get("/filter-booking", BookingController.filterBookings);
bookingRoute.get(
  "/revenue-booking",
  BookingController.calculateRevenueByConsultant
);
bookingRoute.get(
  "/get-booking-of-brand/:brandId",
  BookingController.getBookingOfBrand
);
bookingRoute.get("/get-my-bookings", BookingController.getMyBookings);
bookingRoute.post("/", validate(BookingCreateSchema), BookingController.create);
bookingRoute.put("/:id", BookingController.update);
bookingRoute.put(
  "/:id",
  validate(BookingUpdateStatusSchema),
  BookingController.updateStatus
);
bookingRoute.put(
  "/update-status/:id",
  validate(BookingUpdateStatusSchema),
  BookingController.updateStatus
);
bookingRoute.get(
  "/get-status-booking-interview",
  BookingController.getStatusBookingInterview
);
bookingRoute.post(
  "/get-someone-slots/:accountId",
  validate(GetSomeoneSlotsSchema),
  BookingController.getSomeoneSlots
);
bookingRoute.post(
  "/note-result/:id",
  validate(NoteResultSchema),
  BookingController.noteResult
);
bookingRoute.put(
  "/cancelled-booking/:id",
  //validate(BookingUpdateStatusSchema),
  BookingController.cancelledBooking
);

bookingRoute.put(
  "/update-booking-status/:id",
  //validate(BookingUpdateStatusSchema),
  BookingController.updateBookingStatus
);
export default bookingRoute;
