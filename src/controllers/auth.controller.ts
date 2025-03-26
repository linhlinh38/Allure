import { NextFunction, Request, Response } from "express";
import * as authService from "../services/auth.service";
import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "../configs/envConfig";
import { accountService } from "../services/account.service";
import { generateRefreshToken } from "../utils/jwt";

async function login(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  try {
    const loginResult = await authService.login(email, password);
    if (loginResult) {
      res.setHeader("Authorization", `Bearer ${loginResult.token}`);
      res.status(200).json({
        message: "Login successful",
        data: {
          accessToken: loginResult.token,
          refreshToken: loginResult.refreshToken,
        },
      });
    } else {
      res.status(500).json({
        message: "Server Error",
      });
    }
  } catch (error) {
    next(error);
  }
}

async function loginGoogle(req: Request, res: Response, next: NextFunction) {
  const { code } = req.query;

  try {
    const loginResult = await authService.loginGoogle(code);

    if (loginResult) {
      res.setHeader("Authorization", `Bearer ${loginResult.token}`);
      res.status(200).json({
        message: "Login successful",
        data: {
          accessToken: loginResult.token,
          refreshToken: loginResult.refreshToken,
        },
      });
    } else {
      res.status(500).json({
        message: "Server Error",
      });
    }
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req: Request, res: Response) {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: "Missing refresh token" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      config.SECRET_KEY_FOR_REFRESH_TOKEN
    ) as JwtPayload;
    const accountId = decoded.accountId;

    const account = await accountService.findBy(accountId, "id");
    if (account.length < 0) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { accountId },
      config.SECRET_KEY_FOR_ACCESS_TOKEN,
      {
        expiresIn: "1d",
      }
    );
    const newRefreshToken = generateRefreshToken(accountId.toString());
    res.status(200).json({
      message: "Refresh token Successful",
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
}

export const authController = {
  login,
  loginGoogle,
  refreshToken,
};
