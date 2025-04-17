import express from "express";
import { accountController } from "../controllers/account.controller";
import authentication from "../middleware/authentication";
import validate from "../utils/validate";
import {
  AccountCreateSchema,
  AccountUpdateSchema,
  AccountUpdateStatusSchema,
  RequestResetPasswordSchema,
  ResetPasswordSchema,
} from "../dtos/request/account.request";

const accountRouter = express.Router();

accountRouter.post(
  "/",
  validate(AccountCreateSchema),
  accountController.createAccount
);

accountRouter.put(
  "/set-password/:id",
  validate(ResetPasswordSchema),
  accountController.setPassword
);

accountRouter.put(
  "/verify-account/:id",
  validate(AccountUpdateSchema),
  accountController.verifyAccount
);

accountRouter.post(
  "/request-reset-pass",
  validate(RequestResetPasswordSchema),
  accountController.requestResetPassword
);

accountRouter.put(
  "/modify-password/:id",
  validate(ResetPasswordSchema),
  accountController.modifyPassword
);

accountRouter.post(
  "/resend-verify-email",
  validate(RequestResetPasswordSchema),
  accountController.resendVerifyEmail
);

accountRouter.get("/get-by-id/:id", accountController.getById);
accountRouter.get("/filter-account", accountController.filterAccounts);
accountRouter.get("/get/:option/:value", accountController.getAccountBy);
accountRouter.use(authentication);

accountRouter.post(
  "/request-create-account",
  validate(AccountUpdateSchema),
  accountController.requestCreateAccount
);
accountRouter.post(
  "/update-account-status",
  validate(AccountUpdateStatusSchema),
  accountController.updateAccountStatus
);
accountRouter.post(
  "/get-consultant-recommendation-percentage",
  accountController.calculateBrandRecommendationPercentage
);
accountRouter.post("/brand-staff", accountController.getStaffByBrandAndStatus);
accountRouter.get("/", accountController.getAllAccount);
accountRouter.get("/me", accountController.getMyProfile);
accountRouter.put(
  "/",
  validate(AccountUpdateSchema),
  accountController.updateAccount
);
accountRouter.delete("/:id", accountController.deleteAccount);

accountRouter.get(
  "/checkBannedAccount",
  accountController.checkAllAccountsAndBanIfNecessary
);
export default accountRouter;
