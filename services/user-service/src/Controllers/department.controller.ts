import { Request, Response, NextFunction } from "express";
import { departmentService } from "../Services/department.service";
import { authServiceClient } from "../clients/auth-service.client";
import { AuthenticatedRequest } from "../middlewares/security";
import { AppError } from "../errors/app-error";

const actorOf = (req: Request) => (req as AuthenticatedRequest).user?.id;

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

  purge: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new AppError("UNAUTHENTICATED", 401, "Authentification requise");

      const { password } = req.body as { password?: string };
      if (!password) throw new AppError("MISSING_PASSWORD", 400, "Le mot de passe administrateur est requis");

      const isPasswordValid = await authServiceClient.verifyPassword(authHeader, password);
      if (!isPasswordValid) throw new AppError("INVALID_PASSWORD", 401, "Mot de passe incorrect");

      const actor = actorOf(req) ?? "system";
      const result = await departmentService.purgeAll(actor);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
