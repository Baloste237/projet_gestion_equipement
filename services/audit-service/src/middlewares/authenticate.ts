import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";

export interface JwtPayload {
  id: string;
  role: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("UNAUTHENTICATED", 401, "Token manquant"));
  }

  const token = authHeader.split(" ")[1]!;
  const secret = process.env.JWT_SECRET || "votre_secret_partage_entre_services";

  try {
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return next(new AppError("UNAUTHENTICATED", 401, "Token invalide ou expiré"));
  }
};
