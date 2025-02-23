import express from "express";
import authentication from "../middleware/authentication";
import serviceBookingFormController from "../controllers/serviceBookingForm.controller";
import validate from "../utils/validate";
import {
  ServiceBookingFormCreateSchema,
  ServiceBookingFormUpdateSchema,
} from "../dtos/request/serviceBookingForm.request";
const serviceBookingFormRouter = express.Router();

serviceBookingFormRouter.use(authentication);
serviceBookingFormRouter.get("/", serviceBookingFormController.getAll);
serviceBookingFormRouter.get(
  "/get-by-id/:id",
  serviceBookingFormController.getById
);

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
serviceBookingFormRouter.put(
  "/update-status/:id/:status",
  serviceBookingFormController.updateServiceBookingForm
);
export default serviceBookingFormRouter;
