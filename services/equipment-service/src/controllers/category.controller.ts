import { Request, Response, NextFunction } from "express";
import { categoryService } from "../services/category.service";
import { categoryImportService } from "../services/import-export/category-import.service";
import { authServiceClient } from "../clients/auth-service.client";
import { authorOf } from "../middlewares/security";
import { HttpError } from "../errors/http-error";

export const categoryController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) { next(err); }
  },
  importFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "Aucun fichier reçu" },
        });
      }
      const result = await categoryImportService.import(req.file);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await categoryService.getAll();
      res.status(200).json({ success: true, data: categories });
    } catch (err) { next(err); }
  },
  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.getById(req.params.id);
      res.status(200).json({ success: true, data: category });
    } catch (err) { next(err); }
  },
  update: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (err) { next(err); }
  },
  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await categoryService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
  purge: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new HttpError(401, "Authentification requise");

      const isPasswordValid = await authServiceClient.verifyPassword(authHeader, req.body.password);
      if (!isPasswordValid) {
        throw new HttpError(401, "Mot de passe incorrect");
      }

      const performedBy = authorOf(req) ?? "system";
      const result = await categoryService.purgeAll(performedBy);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
};
