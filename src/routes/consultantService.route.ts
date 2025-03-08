import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import consultantServiceController from "../controllers/consultantService.controller";
import {
  ConsultantServiceCreateSchema,
  ConsultantServiceUpdateSchema,
} from "../dtos/request/consultantService.request";
const consultantServiceRouter = express.Router();

consultantServiceRouter.get("/", consultantServiceController.getAll);

consultantServiceRouter.get(
  "/get-by-id/:id",
  consultantServiceController.getById
);

consultantServiceRouter.get(
  "/get-by-consultant/:id",
  consultantServiceController.getByConsultant
);

consultantServiceRouter.get(
  "/filter-consultant-services",
  consultantServiceController.filterConsultantServices
);
consultantServiceRouter.use(authentication);

consultantServiceRouter.post(
  "/",
  validate(ConsultantServiceCreateSchema),
  consultantServiceController.create
);
consultantServiceRouter.put(
  "/:id",
  validate(ConsultantServiceUpdateSchema),
  consultantServiceController.update
);
consultantServiceRouter.put(
  "/update-status/:id",
  consultantServiceController.updateStatus
);
export default consultantServiceRouter;
