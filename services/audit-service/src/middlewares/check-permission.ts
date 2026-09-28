import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authenticate";
import { AppError } from "../errors/app-error";

export const checkPermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHENTICATED", 401, "Authentification requise"));
    }

    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];
    // Autoriser tout utilisateur connecté (ADMIN, RESPONSABLE, AUDITEUR, EMPLOYE) ou ayant la permission audit:read
    const isAllowed = !!userRole || userPermissions.includes(requiredPermission);

    if (!isAllowed) {
      return next(new AppError("FORBIDDEN", 403, "Vous n'avez pas les permissions nécessaires"));
    }

    next();
  };
};
