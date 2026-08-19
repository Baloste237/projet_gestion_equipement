import { Request, Response, NextFunction } from "express";
import { assignmentService } from "../services/assignment.service";

export const assignmentController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignment = await assignmentService.create(req.body);
      res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  },

  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const assignments = await assignmentService.getAll();
      res.status(200).json({ success: true, data: assignments });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const assignment = await assignmentService.getById(req.params.id);
      res.status(200).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  },

  transfer: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const result = await assignmentService.transfer(req.params.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  return: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const result = await assignmentService.return(req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
