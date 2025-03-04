import express from "express";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import livestreamController from "../controllers/livestream.controller";
const livestreamRouter = express.Router();

livestreamRouter.get("/", livestreamController.getAll);

livestreamRouter.use(authentication);
livestreamRouter.post("/", livestreamController.create);

livestreamRouter.get("/get-by-id/:id", livestreamController.getById);

livestreamRouter.get("/active-live", livestreamController.getActiveLiveStreams);

livestreamRouter.put("/:id", livestreamController.update);
export default livestreamRouter;
