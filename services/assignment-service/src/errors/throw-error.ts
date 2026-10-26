import { ErrorCode } from "./error-codes";
import { AppError } from "./app-error";

export const throwError = (code: ErrorCode, customMessage?: string, details?: unknown): never => {
  throw new AppError(code, customMessage, details);
};
