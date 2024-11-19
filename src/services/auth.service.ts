import { config } from "../configs/envConfig";
import { AppDataSource } from "../dataSource";
import { Account } from "../entities/account.entity";
import { BadRequestError } from "../errors/error";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { generateRefreshToken } from "../utils/jwt";
import GoogleService from "./google.service";

const repository = AppDataSource.getRepository(Account);

export async function login(email: string, password: string) {
  const account = await repository.findOneBy({ email });
  if (!account) {
    throw new BadRequestError("Invalid email");
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
  const refreshToken = generateRefreshToken(account.id.toString());

  return { token, refreshToken };
}

export async function loginGoogle(code) {
  const googleService = new GoogleService();
  const googleToken = await googleService.handleOAuthRedirect(code);
  const userData = await googleService.getUserData(googleToken.idToken);
  console.log("userData ", userData);

  const account = await repository.findOneBy({ email: userData.email });
  if (!account) {
    throw new BadRequestError("Email not exist");
  }
  const payload = { accountId: account.id.toString() };

  const token = jwt.sign(payload, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
    expiresIn: "1d",
  });
  const refreshToken = generateRefreshToken(account.id.toString());

  return { token, refreshToken };
}
