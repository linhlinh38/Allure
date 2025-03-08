import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import systemServiceController from "../controllers/systemService.controller";
import {
  SystemServiceCreateSchema,
  SystemServiceUpdateSchema,
} from "../dtos/request/systemService.request";
const systemServiceRouter = express.Router();

systemServiceRouter.get("/", systemServiceController.getAll);
systemServiceRouter.get("/get-by-id/:id", systemServiceController.getById);
systemServiceRouter.get(
  "/filter-system-services",
  systemServiceController.filterSystemServices
);
systemServiceRouter.use(authentication);

systemServiceRouter.post(
  "/",
  validate(SystemServiceCreateSchema),
  systemServiceController.create
);
systemServiceRouter.put(
  "/:id",
  validate(SystemServiceUpdateSchema),
  systemServiceController.update
);
systemServiceRouter.put(
  "/update-status/:id/:status",
  systemServiceController.updateStatus
);
export default systemServiceRouter;
