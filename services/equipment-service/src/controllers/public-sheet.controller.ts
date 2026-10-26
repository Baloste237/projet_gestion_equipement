import { Request, Response, NextFunction } from "express";
import { publicSheetService } from "../services/public-sheet.service";

export const publicSheetController = {
  get: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const sheet = await publicSheetService.get(req.params.id);
      res.status(200).json({ success: true, data: sheet });
    } catch (err) {
      next(err);
    }
  },
};
