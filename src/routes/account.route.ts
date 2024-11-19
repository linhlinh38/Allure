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
  "/set-password/:id",
  validate(AccountUpdateSchema),
  accountController.setPassword
);

accountRouter.put(
  "/update-account-status/:id",
  validate(AccountUpdateSchema),
  accountController.updateAccountStatus
);

accountRouter.put(
  "/verify-account/:id",
  validate(AccountUpdateSchema),
  accountController.verifyAccount
);

accountRouter.post(
  "/request-reset-pass",
  validate(AccountUpdateSchema),
  accountController.requestResetPassword
);

accountRouter.put(
  "/modify-password/:id",
  validate(AccountUpdateSchema),
  accountController.modifyPassword
);

accountRouter.use(authentication);

accountRouter.post(
  "/request-create-account",
  validate(AccountUpdateSchema),
  accountController.requestCreateAccount
);
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
