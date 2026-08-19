import { ERROR_CODES, ErrorCode } from "./error-codes";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, customMessage?: string) {
    const errorDefinition = ERROR_CODES[code];
    const message = customMessage || errorDefinition.message;
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = errorDefinition.statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
