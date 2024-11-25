import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import PreOrderProductController from "../controllers/preOrderProduct.controller";
import {
  PreOrderProductCreateSchema,
  PreOrderProductUpdateSchema,
} from "../dtos/request/preOrderProduct.request";
const preOrderProductRouter = express.Router();

preOrderProductRouter.use(authentication);
preOrderProductRouter.post(
  "/",
  validate(PreOrderProductCreateSchema),
  PreOrderProductController.create
);

preOrderProductRouter.get("/get-by-id/:id", PreOrderProductController.getById);
preOrderProductRouter.get(
  "/get-pre-order-product-of-brand/:brandId",
  PreOrderProductController.getPreOrderProductActiveOfBrand
);
preOrderProductRouter.get("/", PreOrderProductController.getAll);
preOrderProductRouter.put(
  "/:id",
  validate(PreOrderProductUpdateSchema),
  PreOrderProductController.update
);
export default preOrderProductRouter;
