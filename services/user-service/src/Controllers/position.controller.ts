import { Request, Response, NextFunction } from "express";
import { positionService } from "../Services/position.service";
import { auditPublisher } from "../clients/audit-publisher.client";

// L'identité de l'auteur est transmise par la gateway après vérification du jeton
const author = (req: Request) => {
  const id = req.headers["x-user-id"];
  return typeof id === "string" && id ? id : "inconnu";
};

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
};
