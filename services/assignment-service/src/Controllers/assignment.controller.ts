import { Request, Response, NextFunction } from "express";
import { assignmentService } from "../Services/assignment.service";
import { assignmentFiltersSchema } from "../validators/assignment.validator";
import { AuthenticatedRequest } from "../middlewares/authenticate";

// Identité de l'auteur, lue dans le jeton vérifié par authenticate
const authorOf = (req: Request): string => {
  const id = (req as AuthenticatedRequest).user?.id;
  return typeof id === "string" && id ? id : "inconnu";
};

export const assignmentController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignment = await assignmentService.create(req.body, authorOf(req));
      res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  },

  createBulk: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignments = await assignmentService.createMany(req.body, authorOf(req));
      res.status(201).json({ success: true, data: { count: assignments.length, assignments } });
    } catch (err) {
      next(err);
    }
  },

  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = assignmentFiltersSchema.safeParse(req.query);
      if (!filters.success) {
        return res.status(400).json({ success: false, message: "Les filtres envoyés sont invalides", error: filters.error });
      }
      const assignments = await assignmentService.getAll(filters.data);
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
