import express from "express";
import authentication from "../middleware/authentication";
import BookingController from "../controllers/booking.controller";
const bookingRoute = express.Router();

bookingRoute.use(authentication);
bookingRoute.get("/", BookingController.getAll);
bookingRoute.post("/", BookingController.create);
bookingRoute.put("/:id", BookingController.update);
bookingRoute.get(
  '/get-status-booking-interview',
  BookingController.getStatusBookingInterview
);
export default bookingRoute;
