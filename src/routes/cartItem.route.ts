import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  RoleCreateSchema,
  RoleUpdateSchema,
} from "../dtos/request/role.request";
import RoleController from "../controllers/role.controller";
import CartItemController from "../controllers/cartItem.controller";
const cartItemRouter = express.Router();
cartItemRouter.use(authentication);

cartItemRouter.post("/", CartItemController.create);
cartItemRouter.get("/get-my-cart", CartItemController.getCartItemsOfCustomer);
cartItemRouter.get("/get-by-id/:id", CartItemController.getById);
cartItemRouter.put("/:id", CartItemController.update);
cartItemRouter.delete("/:id", CartItemController.delete);
export default cartItemRouter;
