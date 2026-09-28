import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Les services lèvent `new Error("XXX_NOT_FOUND")` : on les expose en 404
  // pour que les autres services puissent distinguer « introuvable » d'une panne.
  if (typeof err?.message === "string" && err.message.endsWith("_NOT_FOUND")) {
    return res.status(404).json({ success: false, message: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
};
