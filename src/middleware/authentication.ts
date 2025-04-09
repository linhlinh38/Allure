import { NextFunction, Request, Response } from 'express';

export interface AuthRequest extends Request {
  loginUser?: string;
}

const authentication = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.loginUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return next();
};

export default authentication;
