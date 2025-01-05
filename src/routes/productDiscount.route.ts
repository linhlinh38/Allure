import express from "express";
import authentication from "../middleware/authentication";

import ProductDiscountController from "../controllers/productDiscount.controller";
const productDiscountRouter = express.Router();

productDiscountRouter.get("/get-by-id/:id", ProductDiscountController.getById);
productDiscountRouter.get(
  "/get-product-discount-active-of-brand/:brandId",
  ProductDiscountController.getProductDiscountActiveOfBrand
);
productDiscountRouter.get(
  "/get-product-discount-of-brand/:brandId",
  ProductDiscountController.getProductDiscountOfBrand
);
productDiscountRouter.get(
  "/get-product-discount-of-product/:productId",
  ProductDiscountController.getProductDiscountOfProduct
);
productDiscountRouter.get(
  "/filter-product-discount",
  ProductDiscountController.filterProductDiscounts
);
productDiscountRouter.get("/", ProductDiscountController.getAll);

productDiscountRouter.use(authentication);
productDiscountRouter.post("/", ProductDiscountController.create);
productDiscountRouter.put("/:id", ProductDiscountController.update);
export default productDiscountRouter;
