import { Request, Response, NextFunction } from "express";
import { equipmentService } from "../Services/equipment.service";

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
  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await equipmentService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
