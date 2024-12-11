import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  ProductCreateSchema,
  ProductUpdateSchema,
} from "../dtos/request/product.request";
import ProductController from "../controllers/product.controller";

const productRouter = express.Router();

productRouter.get("/get-by-id/:id", ProductController.getById);
productRouter.get("/get-by-brand/:id", ProductController.getByBrand);
productRouter.get("/get-by-category/:id", ProductController.getByCategory);
productRouter.get("/filter-product", ProductController.filterProduct);
productRouter.get("/search-by/:option/:value", ProductController.searchBy);
productRouter.get(
  "/search-name/:searchKey",
  ProductController.searchProductsName
);
productRouter.get("/", ProductController.getAll);
productRouter.use(authentication);
productRouter.post(
  "/",
  validate(ProductCreateSchema),
  ProductController.create
);
productRouter.put(
  "/:id",
  validate(ProductUpdateSchema),
  ProductController.update
);
export default productRouter;
