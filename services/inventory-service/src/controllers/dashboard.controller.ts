import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service";
import { kpiSyncService } from "../services/kpi-sync.service";

export const dashboardController = {
  getKpis: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const kpis = await dashboardService.getKpis();
      res.status(200).json({ success: true, data: kpis });
    } catch (err) {
      next(err);
    }
  },

  rebuildKpis: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await kpiSyncService.rebuild();
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },
};
