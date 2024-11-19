import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  RoleCreateSchema,
  RoleUpdateSchema,
} from "../dtos/request/role.request";
import RoleController from "../controllers/role.controller";
const roleRouter = express.Router();

roleRouter.use(authentication);
roleRouter.post("/", validate(RoleCreateSchema), RoleController.create);

roleRouter.get("/get-by-id/:id", RoleController.getById);
roleRouter.get("/", RoleController.getAll);
roleRouter.put("/:id", validate(RoleUpdateSchema), RoleController.update);
export default roleRouter;
