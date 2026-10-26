import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../errors/app-error";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
  }
  if (err instanceof multer.MulterError || err?.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, code: "INVALID_FILE", message: "Fichier refusé : image JPEG, PNG ou WebP de 2 Mo maximum" });
  }
  // Les services lèvent `new Error("XXX_NOT_FOUND")` : on les expose en 404
  // pour que les autres services puissent distinguer « introuvable » d'une panne.
  if (typeof err?.message === "string" && err.message.endsWith("_NOT_FOUND")) {
    return res.status(404).json({ success: false, message: err.message });
  }
  // Le détail reste dans les journaux serveur : le client ne reçoit qu'un message générique
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Une erreur interne est survenue" });
};
