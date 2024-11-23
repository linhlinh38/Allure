import { Account } from "../entities/account.entity";
import { EmailAlreadyExistError, NotFoundError } from "../errors/error";
import { accountService } from "../services/account.service";
import { NextFunction, Request, Response } from "express";
import { encryptedPassword } from "../utils/jwt";
import { RoleEnum, StatusEnum } from "../utils/enum";
import { AccountResponse } from "../dtos/response/account.response";
import { instanceToPlain, plainToClass } from "class-transformer";
import { AuthRequest } from "../middleware/authentication";
import moment from "moment";
import {
  sendRegisterAccountEmail,
  sendRequestCreateAccountEmail,
  sendResetPasswordEmail,
} from "../services/mail.service";
import { roleService } from "../services/role.service";

async function getAllAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await accountService.findAll();
    const responseData = accounts.map((acc) =>
      plainToClass(AccountResponse, acc)
    );
    return res
      .status(200)
      .send({ message: "Get all account success", data: responseData });
  } catch (error) {
    next(error);
  }
}

async function getAccountBy(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.getBy(
      req.params.value,
      req.params.option as unknown as string
    );

    const responseData = account.map((acc) =>
      plainToClass(AccountResponse, acc)
    );
    return res
      .status(200)
      .send({ message: "Get all account success", data: responseData });
  } catch (error) {
    next(error);
  }
}

async function getMyProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const account = await accountService.getById(req.loginUser);
    const responseData = {
      ...plainToClass(AccountResponse, account),
      dob: account.dob.toLocaleString(),
      createdAt: account.createdAt.toLocaleString(),
      updatedAt: account.updatedAt.toLocaleString(),
    };

    return res
      .status(200)
      .send({ message: "Get account success", data: responseData });
  } catch (error) {
    next(error);
  }
}

async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.createAccount(req.body);

    const responseData = plainToClass(AccountResponse, account);
    return res.status(200).send({
      message: "Create account success",
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
}

async function updateAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.body.password) {
      req.body.password = await encryptedPassword(req.body.password);
    }
    const account = await accountService.update(
      req.loginUser,
      req.body as Account
    );
    return res.status(200).send({ message: "Update account success" });
  } catch (error) {
    next(error);
  }
}

async function verifyAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await accountService.update(req.params.id, {
      status: StatusEnum.ACTIVE,
      isEmailVerify: true,
    });
    return res.status(200).send({ message: "Update account success" });
  } catch (error) {
    next(error);
  }
}

async function updateAccountStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await accountService.update(req.params.id, {
      status: req.body.status,
    });
    return res.status(200).send({ message: "Update account success" });
  } catch (error) {
    next(error);
  }
}

async function requestResetPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const account = await accountService.findBy(req.body.email, "email");
    if (!account[0] || account[0].status !== StatusEnum.ACTIVE) {
      throw new NotFoundError("Account invalid!");
    }
    await sendResetPasswordEmail(account[0]);
    return res
      .status(200)
      .send({ message: "Send reset password mail success" });
  } catch (error) {
    next(error);
  }
}

async function requestCreateAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const checkEmail = await accountService.findBy(req.body.email, "email");

    if (checkEmail.length !== 0) {
      throw new EmailAlreadyExistError("Email already exists!");
    }
    await sendRequestCreateAccountEmail(
      req.body.email,
      req.body.brand,
      req.body.role,
      req.body.url
    );
    return res.status(200).send({ message: "Send mail success" });
  } catch (error) {
    next(error);
  }
}

async function setPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const updateData: Partial<Account> = {
      password: await encryptedPassword(req.body.password),
      status: StatusEnum.ACTIVE,
    };
    const account = await accountService.update(req.params.id, updateData);
    return res.status(200).send({ message: "Update account success" });
  } catch (error) {
    next(error);
  }
}

async function modifyPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const checkAccount = await accountService.findById(req.params.id);
    if (!checkAccount || checkAccount.status !== StatusEnum.ACTIVE) {
      throw new NotFoundError("Account invalid!");
    }
    const updateData: Partial<Account> = {
      password: await encryptedPassword(req.body.password),
    };
    const account = await accountService.update(req.params.id, updateData);
    return res.status(200).send({ message: "Update account success" });
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.delete(
      req.params.id as unknown as string
    );
    return res
      .status(204)
      .send({ message: "Delete account success", data: account });
  } catch (error) {
    next(error);
  }
}

export const accountController = {
  getAllAccount,
  getAccountBy,
  createAccount,
  updateAccount,
  updateAccountStatus,
  deleteAccount,
  getMyProfile,
  setPassword,
  modifyPassword,
  requestResetPassword,
  requestCreateAccount,
  verifyAccount,
};
