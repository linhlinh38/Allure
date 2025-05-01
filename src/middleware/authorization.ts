import { Response, NextFunction } from "express";

import { AuthRequest } from "./authentication";
import { accountRepository } from "../repositories/account.repository";

export const Author = (roles: Array<string>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = req.loginUser;

    try {
      // Fetch the account with its role
      const account = await accountRepository.findOne({
        where: { id },
        relations: ["role"],
      });

      if (!account) {
        return res.status(401).json({ message: "Invalid Account" });
      }

      // Check if the user's role is included in the allowed roles
      if (roles.includes(account.role.role)) {
        next();
      } else {
        return res.status(403).json({
          message: `Unauthorized. This page is for roles: ${roles.join(", ")}`,
        });
      }
    } catch (error) {
      next(error);
    }
  };
};
