import { Account } from "../entities/account.entity";
import { EmailAlreadyExistError, NotFoundError } from "../errors/error";
import { accountService } from "../services/account.service";
import { NextFunction, Request, Response } from "express";
import { encryptedPassword } from "../utils/jwt";
import { RoleEnum, StatusEnum } from "../utils/enum";
import { customerService } from "../services/customer.service";
import { Customer } from "../entities/customer.entity";
import { Manager } from "../entities/manager.entity";
import { managerService } from "../services/manager.service";
import { Staff } from "../entities/staff.entity";
import { staffService } from "../services/staff.service";
import { Consultant } from "../entities/consultant.entity";
import { consultantService } from "../services/consultant.service";
import { KOL } from "../entities/KOL.entity";
import { KOLService } from "../services/KOL.service";
import { Operator } from "../entities/operator.entity";
import { operatorService } from "../services/operator.service";
import { AccountResponse } from "../dtos/response/account.response";
import { instanceToPlain, plainToClass } from "class-transformer";
import { AuthRequest } from "../middleware/authentication";
import moment from "moment";
import {
  sendRegisterAccountEmail,
  sendResetPasswordEmail,
} from "../services/mail.service";

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
    const account = await accountService.findBy(
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
    const account = await accountService.findBy(req.loginUser, "id");
    const responseData = account.map((acc) => {
      return {
        ...plainToClass(AccountResponse, acc),
        dob: acc.dob.toLocaleString(),
        createdAt: acc.createdAt.toLocaleString(),
        updatedAt: acc.updatedAt.toLocaleString(),
      };
    });
    return res
      .status(200)
      .send({ message: "Get account success", data: responseData });
  } catch (error) {
    next(error);
  }
}

async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    // const checkEmail = await accountService.findBy(req.body.email, "email");
    // if (checkEmail.length !== 0) {
    //   throw new EmailAlreadyExistError("Email already exists!");
    // }
    // if (req.body.password) {
    //   req.body.password = await encryptedPassword(req.body.password);
    // }
    // const account: Partial<Account> = {
    //   firstName: req.body.firstName,
    //   lastName: req.body.lastName,
    //   username: req.body.username,
    //   email: req.body.email,
    //   password: req.body.password,
    //   role: req.body.role,
    //   gender: req.body.gender,
    //   phone: req.body.phone,
    //   dob: req.body.dob,
    //   avatar: req.body.avatar,
    //   status: StatusEnum.PENDING,
    // };

    // const accountRes = await accountService.create(account as Account);
    // const { password, ...rest } = accountRes;
    // switch (accountRes.role) {
    //   case RoleEnum.CUSTOMER:
    //     const customer: Partial<Customer> = {
    //       account: accountRes,
    //       address: req.body.address,
    //     };
    //     await customerService.create(customer as Customer);
    //     break;
    //   case RoleEnum.MANAGER:
    //     const manager: Partial<Manager> = {
    //       account: accountRes,
    //     };
    //     await managerService.create(manager as Manager);
    //     break;
    //   case RoleEnum.STAFF:
    //     const staff: Partial<Staff> = {
    //       account: accountRes,
    //     };
    //     await staffService.create(staff as Staff);
    //     break;
    //   case RoleEnum.CONSULTANT:
    //     const consultant: Partial<Consultant> = {
    //       account: accountRes,
    //       yoe: req.body.yoe,
    //       certificates: req.body.certificates,
    //     };
    //     await consultantService.create(consultant as Consultant);
    //     break;
    //   case RoleEnum.KOL:
    //     const kol: Partial<KOL> = {
    //       account: accountRes,
    //       yoe: req.body.yoe,
    //       certificates: req.body.certificates,
    //     };
    //     await KOLService.create(kol as KOL);
    //     break;
    //   case RoleEnum.OPERATION:
    //     const operator: Partial<Operator> = {
    //       account: accountRes,
    //     };
    //     await operatorService.create(operator as Operator);
    //     break;
    // }

    // await sendRegisterAccountEmail(accountRes.username, accountRes.email);
    // return res.status(200).send({
    //   message: "Create account success",
    //   data: { ...rest },
    // });

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
  deleteAccount,
  getMyProfile,
  setPassword,
  modifyPassword,
  requestResetPassword,
};
