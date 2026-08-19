import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { throwError } from "../errors/throw-error";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return throwError("UNAUTHENTICATED");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_jwt_secret";

    const decoded = jwt.verify(token, secret);
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "AppError") return next(err);
    next(throwError("UNAUTHENTICATED"));
  }
};
