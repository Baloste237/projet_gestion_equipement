import { Request, Response, NextFunction } from "express";
import { equipmentService } from "../services/equipment.service";
import { equipmentImportService } from "../services/import-export/equipment-import.service";
import { equipmentExportService } from "../services/import-export/equipment-export.service";

export const equipmentController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const equipment = await equipmentService.create(req.body);
      res.status(201).json({ success: true, data: equipment });
    } catch (err) { next(err); }
  },
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const equipments = await equipmentService.getAll();
      res.status(200).json({ success: true, data: equipments });
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
      const author = req.headers["x-user-id"];
      const { ids, from, to } = req.body;
      const result = await equipmentService.updateStatusBatch(ids, from, to, typeof author === "string" && author ? author : "system");
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
      const result = await equipmentImportService.import(req.file, req.body?.mapping);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  exportFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const format = req.query.format === "xlsx" ? "xlsx" : "csv";
      const file = await equipmentExportService.export(format);
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      res.status(200).send(file.buffer);
    } catch (err) { next(err); }
  },
};
