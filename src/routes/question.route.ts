import express from "express";
import authentication from "../middleware/authentication";
import questionController from "../controllers/question.controller";
const questionRouter = express.Router();

questionRouter.get("/", questionController.getAll);

questionRouter.use(authentication);

questionRouter.post("/", questionController.create);
questionRouter.put("/:id", questionController.update);
questionRouter.delete("/:id", questionController.delete);
export default questionRouter;
