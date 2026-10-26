import { Request, Response, NextFunction } from "express";
import { positionService } from "../Services/position.service";
import { authServiceClient } from "../clients/auth-service.client";
import { AuthenticatedRequest } from "../middlewares/security";
import { auditPublisher } from "../clients/audit-publisher.client";

// L'identité de l'auteur vient du jeton vérifié par ce service
const author = (req: Request) => (req as AuthenticatedRequest).user?.id || "inconnu";

export const positionController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const position = await positionService.create(req.body);
      void auditPublisher.publish({
        action: "POSITION_CREATED",
        entityType: "Position",
        entityId: position.id,
        performedBy: author(req),
        metadata: { name: position.name, departmentId: position.departmentId },
      });
      res.status(201).json({ success: true, data: position });
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const position = await positionService.update(req.params.id, req.body);
      void auditPublisher.publish({
        action: "POSITION_UPDATED",
        entityType: "Position",
        entityId: position.id,
        performedBy: author(req),
        metadata: { changes: req.body },
      });
      res.status(200).json({ success: true, data: position });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const position = await positionService.delete(req.params.id, req.headers.authorization);
      void auditPublisher.publish({
        action: "POSITION_DELETED",
        entityType: "Position",
        entityId: req.params.id,
        performedBy: author(req),
        metadata: { name: position.name, departmentId: position.departmentId },
      });
      res.status(200).json({ success: true, message: "Position deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

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

  purge: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentification requise" } });
      }
      const { password } = req.body as { password?: string };
      if (!password) {
        return res.status(400).json({ success: false, error: { code: "MISSING_PASSWORD", message: "Le mot de passe administrateur est requis" } });
      }
      const isPasswordValid = await authServiceClient.verifyPassword(authHeader, password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: { code: "INVALID_PASSWORD", message: "Mot de passe incorrect" } });
      }
      const performedBy = author(req);
      const result = await positionService.purgeAll(performedBy);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
