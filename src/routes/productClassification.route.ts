import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  ProductClassificationCreateSchema,
  ProductClassificationUpdateSchema,
} from "../dtos/request/productClassification.request";
import ProductClassificationController from "../controllers/productClassification.controller";
const productClassificationRouter = express.Router();
productClassificationRouter.use(authentication);
productClassificationRouter.post(
  "/",
  validate(ProductClassificationCreateSchema),
  ProductClassificationController.create
);

productClassificationRouter.post(
  "/update-classification-title",
  ProductClassificationController.updateClassificationTitle
);

productClassificationRouter.get(
  "/get-by-id/:id",
  ProductClassificationController.getById
);
productClassificationRouter.get("/", ProductClassificationController.getAll);
productClassificationRouter.put(
  "/:id",
  validate(ProductClassificationUpdateSchema),
  ProductClassificationController.update
);
export default productClassificationRouter;
