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
  "/get-pre-order-product-active-of-brand/:brandId",
  PreOrderProductController.getPreOrderProductActiveOfBrand
);
preOrderProductRouter.get(
  "/get-pre-order-product-of-brand/:brandId",
  PreOrderProductController.getPreOrderProductOfBrand
);
preOrderProductRouter.get(
  "/get-pre-order-product-of-product/:productId",
  PreOrderProductController.getPreOrderProductOfProduct
);
preOrderProductRouter.get("/", PreOrderProductController.getAll);
preOrderProductRouter.put(
  "/:id",
  validate(PreOrderProductUpdateSchema),
  PreOrderProductController.update
);
export default preOrderProductRouter;
