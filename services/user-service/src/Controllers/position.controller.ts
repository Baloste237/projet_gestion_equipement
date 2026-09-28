import { Request, Response, NextFunction } from "express";
import { positionService } from "../Services/position.service";

export const positionController = {
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departmentId = typeof req.query.departmentId === "string" ? req.query.departmentId : undefined;
      const positions = await positionService.getAll(departmentId);
      res.status(200).json({ success: true, data: positions });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const position = await positionService.getById(req.params.id);
      res.status(200).json({ success: true, data: position });
    } catch (err) {
      next(err);
    }
  },
};
