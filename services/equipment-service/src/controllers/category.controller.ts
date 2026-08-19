import { Request, Response, NextFunction } from "express";
import { categoryService } from "../services/category.service";

export const categoryController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
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
};
