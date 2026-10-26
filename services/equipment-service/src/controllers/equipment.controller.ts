import { Request, Response, NextFunction } from "express";
import { equipmentService } from "../services/equipment.service";
import { equipmentImportService } from "../services/import-export/equipment-import.service";
import { equipmentExportService } from "../services/import-export/equipment-export.service";
import { authServiceClient } from "../clients/auth-service.client";
import { authorOf } from "../middlewares/security";
import { HttpError } from "../errors/http-error";
import { parseEquipmentListQuery } from "../validators/equipment-list.validator";

export const equipmentController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const equipment = await equipmentService.create(req.body);
      res.status(201).json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // `data` seul sans page ni pageSize (liste complète) ; avec : `data` et `meta`
      const result = await equipmentService.getAll(parseEquipmentListQuery(req.query));
      res.status(200).json({ success: true, ...result });
    } catch (err) { next(err); }
  },
  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const equipment = await equipmentService.getById(req.params.id);
      res.status(200).json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },
  update: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const equipment = await equipmentService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },
  lookup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const equipments = await equipmentService.lookup(req.body.ids);
      res.status(200).json({ success: true, data: equipments });
    } catch (err) { next(err); }
  },
  updateStatusBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const author = authorOf(req);
      const { ids, from, to } = req.body;
      const result = await equipmentService.updateStatusBatch(ids, from, to, author || "system");
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  transfer: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const equipment = await equipmentService.transfer(req.params.id, req.body);
      res.status(200).json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },
  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await equipmentService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
  uploadImage: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "Aucun fichier reçu" },
        });
      }
      const imageUrl = `/uploads/equipments/${req.file.filename}`;
      const equipment = await equipmentService.update(req.params.id, { imageUrl });
      res.status(200).json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },
  previewImport: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "Aucun fichier reçu" },
        });
      }
      const preview = await equipmentImportService.preview(req.file);
      res.status(200).json({ success: true, data: preview });
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
      const result = await equipmentImportService.import(req.file, req.body?.mapping, req.headers.authorization);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  exportFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const format = req.query.format === "xlsx" ? "xlsx" : "csv";
      const file = await equipmentExportService.export(format, req.headers.authorization);
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      res.status(200).send(file.buffer);
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
      const result = await equipmentService.purgeAll(performedBy);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
};
