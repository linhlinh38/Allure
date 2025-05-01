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
  console.log("[DEBUG] loginGoogle function called");
  console.log("[DEBUG] Request query:", req.query);

  const { code } = req.query;
  const redirectUrl = "https://allure-e.netlify.app/auth/google"; // Set your fixed redirect URL here

  console.log(
    "[DEBUG] Google auth code received:",
    code ? "Code exists" : "No code provided"
  );
  console.log("[DEBUG] Redirect URL set to:", redirectUrl);

  try {
    console.log("[DEBUG] Calling authService.loginGoogle with code");
    const loginResult = await authService.loginGoogle(code);
    console.log(
      "[DEBUG] authService.loginGoogle result:",
      loginResult ? "Success" : "Failed"
    );

    if (loginResult) {
      console.log("[DEBUG] Login successful, setting Authorization header");
      // If you still want to set the Authorization header (optional)
      res.setHeader("Authorization", `Bearer ${loginResult.token}`);
      console.log(
        "[DEBUG] Token from loginResult:",
        loginResult.token
          ? loginResult.token.substring(0, 10) + "..."
          : "No token"
      );
      console.log(
        "[DEBUG] RefreshToken from loginResult:",
        loginResult.refreshToken ? "Exists" : "Missing"
      );

      // Check if the tokens exist
      if (loginResult.token && loginResult.refreshToken) {
        console.log("[DEBUG] Both tokens exist, constructing redirect URL");
        // Construct the redirect URL with tokens as query parameters
        const url = new URL(redirectUrl);
        url.searchParams.append("accessToken", loginResult.token);
        url.searchParams.append("refreshToken", loginResult.refreshToken);

        console.log(
          "[DEBUG] Final redirect URL:",
          url
            .toString()
            .replace(
              /accessToken=.*?&|refreshToken=.*/g,
              (token) => `${token.split("=")[0]}=REDACTED&`
            )
        );
        // Redirect to the frontend with tokens in query parameters
        console.log("[DEBUG] Redirecting user to frontend");
        return res.redirect(url.toString());
      } else {
        console.log(
          "[DEBUG] One or both tokens missing, falling back to JSON response"
        );
      }

      // If you want to keep the original JSON response as a fallback
      console.log("[DEBUG] Sending JSON response with tokens");
      return res.status(200).json({
        message: "Login successful",
        data: {
          accessToken: loginResult.token ? "REDACTED" : null,
          refreshToken: loginResult.refreshToken ? "REDACTED" : null,
        },
      });
    } else {
      console.log("[DEBUG] Login result is falsy, sending server error");
      return res.status(500).json({
        message: "Server Error",
      });
    }
  } catch (error) {
    console.error("[DEBUG] Error in loginGoogle:", error);
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
    const newRefreshToken = await generateRefreshToken(accountId);
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
