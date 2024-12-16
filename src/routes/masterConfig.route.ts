import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import masterConfigController from "../controllers/masterConfig.controller";
const masterConfigRouter = express.Router();

masterConfigRouter.get("/", masterConfigController.getAll);

masterConfigRouter.use(authentication);
masterConfigRouter.post("/", masterConfigController.create);

masterConfigRouter.get("/get-by-id/:id", masterConfigController.getById);

masterConfigRouter.put("/:id", masterConfigController.update);
export default masterConfigRouter;
