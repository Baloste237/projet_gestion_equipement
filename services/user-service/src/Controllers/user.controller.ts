import { Request, Response, NextFunction } from "express";
import { userService } from "../Services/user.service";
import { authServiceClient } from "../clients/auth-service.client";
import { AuthenticatedRequest } from "../middlewares/security";
import { AppError } from "../errors/app-error";

// Auteur de l'action : identifiant du compte, lu dans le jeton vérifié par ce service
const actorOf = (req: Request) => (req as AuthenticatedRequest).user?.id;

export const userController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.create(req.body, actorOf(req));
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userService.getAll();
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  // Fiche de l'utilisateur connecté, retrouvée par l'identifiant de son compte (jeton)
  me: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = actorOf(req);
      if (!accountId) return res.status(401).json({ success: false, message: "Authentification requise" });
      const user = await userService.getByAuthUserId(accountId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  updateProfile: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateProfile(req.params.id, req.body);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  updateRole: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateRole(req.params.id, req.body, actorOf(req));
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  deactivate: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.deactivate(req.params.id, actorOf(req));
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  reactivate: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.reactivate(req.params.id, actorOf(req));
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await userService.delete(req.params.id, actorOf(req));
      res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

  uploadAvatar: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "Aucun fichier reçu" },
        });
      }
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await userService.updateProfile(req.params.id, { avatarUrl });
      res.status(200).json({ success: true, data: user });
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

      const actorAuthId = actorOf(req);
      if (!actorAuthId) throw new AppError("UNAUTHENTICATED", 401, "Authentification requise");

      const result = await userService.purgeNonAdminUsers(actorAuthId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
