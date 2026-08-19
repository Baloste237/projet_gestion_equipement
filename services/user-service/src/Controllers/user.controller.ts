import { Request, Response, NextFunction } from "express";
import { userService } from "../Services/user.service";

export const userController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.create(req.body);
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
      const user = await userService.updateRole(req.params.id, req.body);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  deactivate: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.deactivate(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  reactivate: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const user = await userService.reactivate(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await userService.delete(req.params.id);
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
};
