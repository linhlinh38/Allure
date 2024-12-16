import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import serviceController from "../controllers/service.controller";
const serviceRouter = express.Router();

serviceRouter.get("/", serviceController.getAll);

serviceRouter.use(authentication);

serviceRouter.post("/", serviceController.create);
serviceRouter.put("/:id", serviceController.update);
export default serviceRouter;
