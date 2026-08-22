export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Not authenticated') {
    super(401, message);
  }
}
