import { Request, Response, NextFunction } from "express";
import { supplierService } from "../services/supplier.service";

export const supplierController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supplier = await supplierService.create(req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (err) { next(err); }
  },
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const suppliers = await supplierService.getAll();
      res.status(200).json({ success: true, data: suppliers });
    } catch (err) { next(err); }
  },
  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const supplier = await supplierService.getById(req.params.id);
      res.status(200).json({ success: true, data: supplier });
    } catch (err) { next(err); }
  },
  update: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const supplier = await supplierService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: supplier });
    } catch (err) { next(err); }
  },
  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await supplierService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
