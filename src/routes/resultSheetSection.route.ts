import express from "express";
import authentication from "../middleware/authentication";
import resultSheetSectionController from "../controllers/resultSheetSection.controller";
const resultSheetSectionRouter = express.Router();

resultSheetSectionRouter.get("/", resultSheetSectionController.getAll);

resultSheetSectionRouter.use(authentication);

resultSheetSectionRouter.post("/", resultSheetSectionController.create);
resultSheetSectionRouter.put("/:id", resultSheetSectionController.update);
resultSheetSectionRouter.delete("/:id", resultSheetSectionController.delete);
export default resultSheetSectionRouter;
