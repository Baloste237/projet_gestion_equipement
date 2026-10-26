import { Request, Response, NextFunction } from "express";
import { credentialAdminService } from "../services/credential-admin.service";
import { credentialIdParam } from "../validators/credential-admin.validator";

export const credentialAdminController = {
  getByEmail: async (req: Request<{ email: string }>, res: Response, next: NextFunction) => {
    try {
      const credential = await credentialAdminService.getByEmail(req.params.email);
      res.status(200).json({ success: true, data: credential });
    } catch (err) { next(err); }
  },

  update: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!credentialIdParam.safeParse(req.params.id).success) {
        return res.status(400).json({ success: false, message: "Identifiant de compte invalide" });
      }
      const credential = await credentialAdminService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: credential });
    } catch (err) { next(err); }
  },
};
