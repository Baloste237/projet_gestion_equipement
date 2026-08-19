import { Request, Response, NextFunction } from "express";
import { auditLogService } from "../services/audit-log.service";

export const auditLogController = {
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await auditLogService.getAll();
      res.status(200).json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const log = await auditLogService.getById(req.params.id);
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  },
};
