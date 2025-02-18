import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import BookingController from "../controllers/booking.controller";
const bookingRoute = express.Router();

bookingRoute.use(authentication);
bookingRoute.get("/", BookingController.getAll);
bookingRoute.post("/", BookingController.create);
bookingRoute.put("/:id", BookingController.update);
export default bookingRoute;
