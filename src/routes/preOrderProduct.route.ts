import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import PreOrderProductController from "../controllers/preOrderProduct.controller";
import {
  PreOrderProductCreateSchema,
  PreOrderProductUpdateSchema,
} from "../dtos/request/preOrderProduct.request";
import { Author } from "../middleware/authorization";
const preOrderProductRouter = express.Router();

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
preOrderProductRouter.get(
  "/filter-pre-order-product",
  PreOrderProductController.filterPreOrderProducts
);
preOrderProductRouter.use(authentication);

preOrderProductRouter.post(
  "/",
  Author(["MANAGER", "STAFF"]),
  validate(PreOrderProductCreateSchema),
  PreOrderProductController.create
);
preOrderProductRouter.put(
  "/:id",
  Author(["MANAGER", "STAFF", "ADMIN", "OPERATOR"]),
  validate(PreOrderProductUpdateSchema),
  PreOrderProductController.update
);
export default preOrderProductRouter;
