import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authenticate";
import { AppError } from "../errors/app-error";

export const checkPermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHENTICATED", 401, "Authentification requise"));
    }

    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return next(new AppError("FORBIDDEN", 403, "Vous n'avez pas les permissions nécessaires"));
    }

    next();
  };
};
