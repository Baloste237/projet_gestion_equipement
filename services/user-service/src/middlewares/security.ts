import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";

export interface JwtPayload {
  id: string;
  role: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  internal?: boolean;
}

const unauthenticated = (message = "Authentification requise") => new AppError("UNAUTHENTICATED", 401, message);
const forbidden = (message = "Accès refusé") => new AppError("FORBIDDEN", 403, message);

/** Secrets lus à chaque appel : aucune valeur de repli, absence = service inutilisable. */
export const requireSecret = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement ${name} obligatoire`);
  return value;
};

/** À appeler au démarrage : le service refuse de démarrer s'il manque un secret. */
export const assertSecurityConfig = () => {
  requireSecret("JWT_SECRET");
  requireSecret("INTERNAL_SERVICE_TOKEN");
};

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

const hasValidInternalToken = (req: Request): boolean => {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const provided = req.headers["x-internal-token"];
  return Boolean(expected) && typeof provided === "string" && safeEqual(provided, expected as string);
};

/** Vérifie le jeton d'accès : l'identité vient uniquement du jeton, jamais des en-têtes `x-user-*`. */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const secret = process.env.JWT_SECRET;
  const header = req.headers.authorization;
  if (!secret || !header || !header.startsWith("Bearer ")) return next(unauthenticated());

  try {
    const decoded = jwt.verify(header.split(" ")[1]!, secret) as JwtPayload;
    if (!decoded || typeof decoded.id !== "string" || typeof decoded.role !== "string") {
      return next(unauthenticated("Jeton invalide ou expiré"));
    }
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    next(unauthenticated("Jeton invalide ou expiré"));
  }
};

/** Jeton utilisateur valide OU secret interne (appels de service à service). */
export const authenticateOrInternal = (req: Request, res: Response, next: NextFunction) => {
  if (hasValidInternalToken(req)) {
    (req as AuthenticatedRequest).internal = true;
    return next();
  }
  authenticate(req, res, next);
};

export const requireRole = (...roles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return next(unauthenticated());
  if (!roles.includes(user.role)) return next(forbidden());
  next();
};

/**
 * Autorise un ADMIN, ou le propriétaire du profil visé. `resolveOwner` retourne l'identifiant
 * d'authentification (authUserId) du profil `:id`, ou null s'il n'existe pas.
 */
export const requireOwnerOrAdmin =
  (resolveOwner: (profileId: string) => Promise<string | null>) =>
  async (req: Request<{ id: string }>, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) return next(unauthenticated());
    if (user.role === "ADMIN") return next();
    try {
      const owner = await resolveOwner(req.params.id);
      if (owner && owner === user.id) return next();
      next(forbidden());
    } catch (err) {
      next(err);
    }
  };
