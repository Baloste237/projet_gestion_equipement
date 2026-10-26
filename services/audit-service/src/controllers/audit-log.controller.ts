import { Request, Response, NextFunction } from "express";
import { auditLogService } from "../services/audit-log.service";
import { parseAuditListQuery } from "../validators/audit-list.validator";

export const auditLogController = {
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // `data` seul sans page ni pageSize ; avec : `data`, `meta` et `summary`
      const result = await auditLogService.getAll(parseAuditListQuery(req.query));
      res.status(200).json({ success: true, ...result });
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

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await auditLogService.create(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  },
};
