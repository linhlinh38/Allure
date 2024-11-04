import { HttpError } from "./httpError";

export class EmailAlreadyExistError extends HttpError {
  constructor(message: string = "Email already existed!") {
    super(message, 400);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404);
  }
}
