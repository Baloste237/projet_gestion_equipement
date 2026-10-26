import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { detectImageType, readHead, IMAGE_EXTENSIONS } from "../utils/image-signature";

const uploadDir = path.join(__dirname, "..", "..", "uploads", "avatars");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Nom provisoire sans extension fournie par le client : l'extension finale vient du contenu (verifyImageContent)
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.upload`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("INVALID_FILE_TYPE"));
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
});

/**
 * Contrôle du contenu réel après réception : le type MIME et l'extension viennent du client et sont falsifiables.
 * Un fichier dont la signature n'est pas JPEG, PNG ou WebP est supprimé et rejeté ; l'extension finale est celle du type détecté.
 */
export const verifyImageContent = (req: Request, _res: Response, next: NextFunction) => {
  const file = req.file;
  if (!file) return next();
  try {
    const type = detectImageType(readHead(file.path));
    if (!type) {
      fs.unlinkSync(file.path);
      return next(new Error("INVALID_FILE_TYPE"));
    }
    const finalPath = path.join(path.dirname(file.path), `${path.parse(file.filename).name}${IMAGE_EXTENSIONS[type]}`);
    if (finalPath !== file.path) fs.renameSync(file.path, finalPath);
    file.path = finalPath;
    file.filename = path.basename(finalPath);
    next();
  } catch (err) {
    fs.rmSync(file.path, { force: true });
    next(err);
  }
};
