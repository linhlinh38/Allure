import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  AddressCreateSchema,
  AddressUpdateSchema,
} from "../dtos/request/address.request";
import AddressController from "../controllers/address.controller";
const addressRouter = express.Router();

addressRouter.use(authentication);
addressRouter.post(
  "/",
  validate(AddressCreateSchema),
  AddressController.create
);

addressRouter.get("/get-by-id/:id", AddressController.getById);
addressRouter.get("/", AddressController.getAll);
addressRouter.put(
  "/:id",
  validate(AddressUpdateSchema),
  AddressController.update
);
export default addressRouter;
