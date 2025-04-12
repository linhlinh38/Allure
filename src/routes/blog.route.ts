import express from "express";
import authentication from "../middleware/authentication";

import BlogController from "../controllers/blog.controller";
const blogRouter = express.Router();

blogRouter.get("/", BlogController.getAll);
blogRouter.get("/filter-blogs", BlogController.filterBlogs);
blogRouter.get("/tag/:tag", BlogController.findByTag);

blogRouter.use(authentication);
blogRouter.post("/", BlogController.create);

blogRouter.get("/get-by-id/:id", BlogController.getById);

blogRouter.put("/:id", BlogController.update);
export default blogRouter;
