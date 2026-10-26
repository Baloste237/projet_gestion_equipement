import { ERROR_CODES, ErrorCode } from "./error-codes";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  /** Informations structurées renvoyées au client (ex. équipements refusés d'une affectation groupée) */
  public readonly details?: unknown;

  constructor(code: ErrorCode, customMessage?: string, details?: unknown) {
    const errorDefinition = ERROR_CODES[code];
    const message = customMessage || errorDefinition.message;
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = errorDefinition.statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
