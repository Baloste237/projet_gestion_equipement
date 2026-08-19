import { Request, Response, NextFunction } from "express";
import { inventoryService } from "../services/inventory.service";

interface AuthenticatedRequest extends Request {
  user?: { id: string; userId: string; role: string; permissions: string[] };
}

export const inventoryController = {
  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const inventory = await inventoryService.create({
        title: req.body.title,
        createdBy: req.user!.id,
      });
      res.status(201).json({ success: true, data: inventory });
    } catch (err) { next(err); }
  },

  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const inventories = await inventoryService.getAll();
      res.status(200).json({ success: true, data: inventories });
    } catch (err) { next(err); }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const inventory = await inventoryService.getById(id);
      res.status(200).json({ success: true, data: inventory });
    } catch (err) { next(err); }
  },

  addItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const item = await inventoryService.addItem(id, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  checkItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = req.params.itemId as string;
      const item = await inventoryService.checkItem(itemId, req.body);
      res.status(200).json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  complete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const inventory = await inventoryService.complete(id);
      res.status(200).json({ success: true, data: inventory });
    } catch (err) { next(err); }
  },
};
