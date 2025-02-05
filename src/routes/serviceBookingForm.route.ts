import express from "express";
import authentication from "../middleware/authentication";
import serviceBookingFormController from "../controllers/serviceBookingForm.controller";
import validate from "../utils/validate";
import {
  ServiceBookingFormCreateSchema,
  ServiceBookingFormUpdateSchema,
} from "../dtos/request/serviceBookingForm.request";
const serviceBookingFormRouter = express.Router();

serviceBookingFormRouter.get("/", serviceBookingFormController.getAll);

serviceBookingFormRouter.use(authentication);

serviceBookingFormRouter.post(
  "/",
  validate(ServiceBookingFormCreateSchema),
  serviceBookingFormController.create
);
serviceBookingFormRouter.put(
  "/:id",
  validate(ServiceBookingFormUpdateSchema),
  serviceBookingFormController.update
);
export default serviceBookingFormRouter;
