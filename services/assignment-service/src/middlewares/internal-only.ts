import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { throwError } from "../errors/throw-error";

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Réserve une route aux appels de service à service : secret partagé dans `x-internal-token`.
 * Les ports des services sont publiés, la passerelle ne suffit donc pas à les protéger ;
 * sans secret configuré, la route refuse tout.
 */
export const internalOnly = (req: Request, _res: Response, next: NextFunction) => {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const provided = req.headers["x-internal-token"];
  if (!expected || typeof provided !== "string" || !safeEqual(provided, expected)) {
    return next(throwError("FORBIDDEN"));
  }
  next();
};
