import express from "express";
import authentication from "../middleware/authentication";
import resultSheetController from "../controllers/resultSheet.controller";
import validate from "../utils/validate";
import {
  ServiceBookingFormCreateSchema,
  ServiceBookingFormUpdateSchema,
} from "../dtos/request/serviceBookingForm.request";
import { ResultSheetCreateSchema } from "../dtos/request/resultSheet.request";
import { ResultSheetSectionUpdateSchema } from "../dtos/request/resultSheetSection.request";
const resultSheetRoute = express.Router();

resultSheetRoute.use(authentication);
resultSheetRoute.get("/", resultSheetController.getAll);
resultSheetRoute.get("/get-by-id/:id", resultSheetController.getById);

resultSheetRoute.post(
  "/",
  validate(ResultSheetCreateSchema),
  resultSheetController.create
);
resultSheetRoute.put(
  "/:id",
  validate(ResultSheetSectionUpdateSchema),
  resultSheetController.update
);
export default resultSheetRoute;
