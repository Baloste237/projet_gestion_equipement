import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (typeof err?.statusCode === "number" && err.statusCode < 500) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }
  if (err instanceof multer.MulterError || err?.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, message: err.code || err.message });
  }
  // Le détail reste dans les journaux serveur : le client ne reçoit qu'un message générique
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Une erreur interne est survenue" });
};
