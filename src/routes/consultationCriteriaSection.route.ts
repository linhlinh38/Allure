import express from "express";
import authentication from "../middleware/authentication";
import consultationCriteriaSectionController from "../controllers/consultationCriteriaSection.controller";
const consultationCriteriaSectionRouter = express.Router();

consultationCriteriaSectionRouter.get(
  "/",
  consultationCriteriaSectionController.getAll
);

consultationCriteriaSectionRouter.use(authentication);

consultationCriteriaSectionRouter.post(
  "/",
  consultationCriteriaSectionController.create
);
consultationCriteriaSectionRouter.put(
  "/:id",
  consultationCriteriaSectionController.update
);
consultationCriteriaSectionRouter.delete(
  "/:id",
  consultationCriteriaSectionController.delete
);
export default consultationCriteriaSectionRouter;
