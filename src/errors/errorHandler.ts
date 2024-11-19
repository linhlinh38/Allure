import { Request, Response, NextFunction } from "express";
import Logging from "../utils/Logging";
import { HttpError } from "./httpError";
import { DatabaseError } from "./databaseError";
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!err) return next();
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ message: err.message });
  } else if (err instanceof DatabaseError) {
    Logging.error(err);
    res.status(503).json({ message: err.message });
  } else {
    Logging.error(err);
    res.status(500).json({ message: err.message });
  }
}
