import express from "express";
import { accountController } from "../controllers/account.controller";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  AccountCreateSchema,
  AccountUpdateSchema,
} from "../dtos/request/account.request";

const accountRouter = express.Router();

accountRouter.post(
  "/",
  validate(AccountCreateSchema),
  accountController.createAccount
);

accountRouter.put(
  "update-account/:id",
  validate(AccountUpdateSchema),
  accountController.setPassword
);

accountRouter.use(authentication);
accountRouter.get("/", accountController.getAllAccount);
accountRouter.get("/me", accountController.getMyProfile);
accountRouter.get("/get/:option/:value", accountController.getAccountBy);
accountRouter.put(
  "/",
  validate(AccountUpdateSchema),
  accountController.updateAccount
);
accountRouter.delete("/:id", accountController.deleteAccount);
export default accountRouter;
