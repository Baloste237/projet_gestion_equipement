import { ERROR_CODES, ErrorCode } from "./error-codes";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, customMessage?: string) {
    const errorDefinition = ERROR_CODES[code];
    const message = customMessage || errorDefinition?.message || "Une erreur est survenue";
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = errorDefinition?.statusCode || 500;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
