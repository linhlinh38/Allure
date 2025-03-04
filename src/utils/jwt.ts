import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { config } from "../configs/envConfig";

export function generateRefreshToken(userId: string) {
  const payload = { userId: userId };
  const refreshToken = jwt.sign(payload, config.SECRET_KEY_FOR_REFRESH_TOKEN, {
    expiresIn: "7d",
  });
  return refreshToken;
}

export async function encryptedPassword(password: string) {
  const salt = await bcrypt.genSalt(8);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}
