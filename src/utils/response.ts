import { Response } from 'express';

export function createBadResponse(res: Response, message: string) {
  return res.status(400).send({ message });
}

export function createNormalResponse(
  res: Response,
  message: string,
  data?: any
) {
  return res.status(200).send({ message, data });
}
