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
export default systemServiceRouter;
