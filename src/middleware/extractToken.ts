import { NextFunction, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../configs/envConfig';
import { AuthRequest } from './authentication';

const { SECRET_KEY_FOR_ACCESS_TOKEN } = config;


export function isJwtPayload(
  decoded: string | JwtPayload
): decoded is JwtPayload {
  return typeof decoded !== 'string';
}

const extractToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  // Extract token from 'Bearer token' format
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY_FOR_ACCESS_TOKEN);
    if (isJwtPayload(decoded)) {
      req.loginUser = decoded.accountId;
    }
  } catch (error) {
  } finally {
    return next();
  }
};

export default extractToken;
