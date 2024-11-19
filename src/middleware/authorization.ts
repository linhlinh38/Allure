import { Response, NextFunction } from "express";

import { AuthRequest } from "./authentication";
import { accountService } from "../services/account.service";

export const Author = (roles: Array<string>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = req.loginUser;

    let account;
    try {
      account = await accountService.getById(id);
    } catch (error) {
      next(error);
    }

    if (account.length == 0)
      return res.status(401).json({ message: "Invalid Account" });

    if (roles.indexOf(account.role) > -1) next();
    else
      return res
        .status(401)
        .json({ message: `Unauthorization. This is page for ${roles}` });
  };
};
