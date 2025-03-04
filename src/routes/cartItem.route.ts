import express from "express";
import authentication from "../middleware/authentication";


import CartItemController from "../controllers/cartItem.controller";
const cartItemRouter = express.Router();
cartItemRouter.use(authentication);

cartItemRouter.post("/", CartItemController.create);
cartItemRouter.get("/get-my-cart", CartItemController.getCartItemsOfCustomer);
cartItemRouter.get("/get-by-id/:id", CartItemController.getById);
cartItemRouter.put("/:id", CartItemController.update);
cartItemRouter.delete("/:id", CartItemController.delete);
cartItemRouter.post("/remove-all", CartItemController.removeAllCart);
cartItemRouter.post("/remove-multiple", CartItemController.removeMultipleItems);
export default cartItemRouter;
