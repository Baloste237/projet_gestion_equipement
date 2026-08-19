import { Request, Response, NextFunction } from "express";
import { throwError } from "../errors/throw-error";
import { AuthenticatedRequest } from "./authenticate";

export const checkPermission = (requiredPermission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(throwError("UNAUTHENTICATED"));
    }

    // Bypass for ADMIN or check if permissions array includes requiredPermission
    const userPermissions: string[] = user.permissions || [];
    const isAllowed = user.role === "ADMIN" || userPermissions.includes(requiredPermission);

    if (!isAllowed) {
      return next(throwError("FORBIDDEN"));
    }

    next();
  };
};
