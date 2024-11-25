import express from "express";
import authentication from "../middleware/authentication";

import ProductDiscountController from "../controllers/productDiscount.controller";
const productDiscountRouter = express.Router();

productDiscountRouter.post("/", ProductDiscountController.create);

productDiscountRouter.get("/get-by-id/:id", ProductDiscountController.getById);
productDiscountRouter.get(
  "/get-product-discount-of-brand/:brandId",
  ProductDiscountController.getProductDiscountActiveOfBrand
);
productDiscountRouter.get("/", ProductDiscountController.getAll);
productDiscountRouter.put("/:id", ProductDiscountController.update);
export default productDiscountRouter;
