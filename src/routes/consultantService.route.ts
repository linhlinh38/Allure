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
export default consultantServiceRouter;
