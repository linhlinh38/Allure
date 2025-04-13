import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
} from "../dtos/request/category.request";
import CategoryController from "../controllers/category.controller";
const categoryRouter = express.Router();

categoryRouter.get("/get-by-id/:id", CategoryController.getById);
categoryRouter.get("/", CategoryController.getAll);
categoryRouter.get("/filter-category", CategoryController.filterCategories);
categoryRouter.use(authentication);
categoryRouter.post(
  "/",
  validate(CategoryCreateSchema),
  CategoryController.create
);
categoryRouter.put(
  "/:id",
  validate(CategoryUpdateSchema),
  CategoryController.update
);
export default categoryRouter;
