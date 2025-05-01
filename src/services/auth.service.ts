import { config } from "../configs/envConfig";
import { AppDataSource } from "../dataSource";
import { Account } from "../entities/account.entity";
import { BadRequestError } from "../errors/error";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateRefreshToken } from "../utils/jwt";
import GoogleService from "./google.service";
import { roleService } from "./role.service";

const repository = AppDataSource.getRepository(Account);

export async function login(email: string, password: string) {
  const account = await repository.findOneBy({ email });
  if (!account) {
    throw new BadRequestError("Invalid email");
  }
  if (account.isEmailVerify === false) {
    throw new BadRequestError("Email is not verified");
  }

  if (account.password) {
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new BadRequestError("Invalid password");
    }
  } else {
    throw new BadRequestError(
      "User must login by another way not using password"
    );
  }

  const payload = { accountId: account.id.toString() };
  const token = jwt.sign(payload, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
    expiresIn: "1d",
  });
  const refreshToken = await generateRefreshToken(account.id.toString());

  return { token, refreshToken };
}

export async function loginGoogle(code) {
  const googleService = new GoogleService();
  const googleToken = await googleService.handleOAuthRedirect(code);
  const userData = await googleService.getUserData(googleToken.idToken);
  console.log("userData ", userData);

  const account = await repository.findOneBy({ email: userData.email });
  let id = account?.id;
  if (!account) {
    const role = await roleService.findBy("CUSTOMER", "role");
    if (role.length !== 1) {
      throw new BadRequestError("Invalid role");
    }

    const newAccount = new Account();
    newAccount.email = userData.email;
    newAccount.username = userData.email.split("@")[0];
    newAccount.firstName = userData?.given_name;
    newAccount.lastName = userData?.family_name;
    newAccount.avatar = userData?.picture;
    newAccount.isEmailVerify = true;
    newAccount.role = role[0];

    const user = await repository.save(newAccount);
    id = user.id;
  }
  const payload = { accountId: id.toString() };

  const token = jwt.sign(payload, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
    expiresIn: "1d",
  });
  const refreshToken = await generateRefreshToken(account.id.toString());

  return { token, refreshToken };
}
