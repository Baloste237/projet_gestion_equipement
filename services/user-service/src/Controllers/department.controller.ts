import { Request, Response, NextFunction } from "express";
import { departmentService } from "../Services/department.service";

export const departmentController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await departmentService.create(req.body);
      res.status(201).json({ success: true, data: department });
    } catch (err) {
      next(err);
    }
  },

  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await departmentService.getAll();
      res.status(200).json({ success: true, data: departments });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const department = await departmentService.getById(req.params.id);
      res.status(200).json({ success: true, data: department });
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const department = await departmentService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: department });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await departmentService.delete(req.params.id);
      res.status(200).json({ success: true, message: "Department deleted successfully" });
    } catch (err) {
      next(err);
    }
  },
};
