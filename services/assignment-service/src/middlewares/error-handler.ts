import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  console.error("[ERROR]", err);
  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: err.message || "Une erreur interne est survenue",
  });
};
