import { Request, Response, NextFunction } from "express";
import { throwError } from "../errors/throw-error";
import { AuthenticatedRequest } from "./authenticate";

export const checkPermission = (requiredPermission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(throwError("UNAUTHENTICATED"));
    }

    // Bypass for ADMIN, RESPONSABLE, and AUDITEUR or check if permissions array includes requiredPermission
    const userPermissions: string[] = user.permissions || [];
    const isAllowed = user.role === "ADMIN" || user.role === "RESPONSABLE" || user.role === "AUDITEUR" || userPermissions.includes(requiredPermission);

    if (!isAllowed) {
      return next(throwError("FORBIDDEN"));
    }

    next();
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return next(throwError("UNAUTHENTICATED"));
    if (!roles.includes(user.role)) return next(throwError("FORBIDDEN"));
    next();
  };
};
