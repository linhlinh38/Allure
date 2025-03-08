import express from "express";
import authentication from "../middleware/authentication";
import consultationCriteriaController from "../controllers/consultationCriteria.controller";
import validate from "../utils/validate";


import {
  ConsultationCriteriaCreateSchema,
  ConsultationCriteriaUpdateSchema,
} from "../dtos/request/consultationCriteria.request";
const consultationCriteriaRoute = express.Router();

consultationCriteriaRoute.use(authentication);
consultationCriteriaRoute.get("/", consultationCriteriaController.getAll);
consultationCriteriaRoute.get(
  "/get-by-id/:id",
  consultationCriteriaController.getById
);

consultationCriteriaRoute.post(
  "/",
  validate(ConsultationCriteriaCreateSchema),
  consultationCriteriaController.create
);
consultationCriteriaRoute.put(
  "/:id",
  validate(ConsultationCriteriaUpdateSchema),
  consultationCriteriaController.update
);

consultationCriteriaRoute.put(
  "/update-status/:id",
  consultationCriteriaController.updateStatus
);
export default consultationCriteriaRoute;
