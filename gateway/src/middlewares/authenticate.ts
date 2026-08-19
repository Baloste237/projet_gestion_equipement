import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";
import env from "../config/env";

export interface JwtPayload {
  id: string;
  role: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError("UNAUTHENTICATED", ERROR_CODES.UNAUTHENTICATED.statusCode, ERROR_CODES.UNAUTHENTICATED.message)
    );
  }

  const token = authHeader.split(" ")[1]!;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;

    // Le Gateway transmet l'identité en interne aux microservices
    // via des headers, en plus du token brut (double garantie)
    req.headers["x-user-id"] = decoded.id;
    req.headers["x-user-role"] = decoded.role;

    next();
  } catch {
    return next(
      new AppError("TOKEN_EXPIRED", ERROR_CODES.TOKEN_EXPIRED.statusCode, ERROR_CODES.TOKEN_EXPIRED.message)
    );
  }
};
