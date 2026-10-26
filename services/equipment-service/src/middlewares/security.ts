import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../errors/http-error";

export interface JwtPayload {
  id: string;
  role: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  internal?: boolean;
}

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

/** Vérifie le jeton d'accès : l'identité vient uniquement du jeton, jamais des en-têtes `x-user-*`. */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const secret = process.env.JWT_SECRET;
  const header = req.headers.authorization;
  if (!secret || !header || !header.startsWith("Bearer ")) {
    return next(new HttpError(401, "Authentification requise"));
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1]!, secret) as JwtPayload;
    if (!decoded || typeof decoded.id !== "string" || typeof decoded.role !== "string") {
      return next(new HttpError(401, "Jeton invalide ou expiré"));
    }
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    next(new HttpError(401, "Jeton invalide ou expiré"));
  }
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

/**
 * Routes ouvertes aux autres services (secret interne), relatives au montage `/api/equipments` :
 * lecture, recherche par identifiants, changement de statut. Le reste (création, suppression, import,
 * export, transfert, image) exige un jeton utilisateur. `PATCH /:id` n'est ouvert que pour `{ status }`.
 */
const isInternalRoute = (req: Request): boolean => {
  const path = req.path;
  const single = /^\/[^/]+$/.test(path) && path !== "/export";
  if (req.method === "GET") return path === "/" || single;
  if (req.method === "POST") return path === "/lookup" || path === "/status/batch";
  if (req.method === "PATCH" && single) {
    const keys = req.body && typeof req.body === "object" ? Object.keys(req.body) : [];
    return keys.length === 1 && keys[0] === "status";
  }
  return false;
};

/** Jeton utilisateur valide OU secret interne limité aux routes de service à service. */
export const authenticateOrInternal = (req: Request, res: Response, next: NextFunction) => {
  if (hasValidInternalToken(req) && isInternalRoute(req)) {
    (req as AuthenticatedRequest).internal = true;
    return next();
  }
  authenticate(req, res, next);
};

/** Réserve une route aux rôles indiqués ; à placer après `authenticate`. */
export const requireRole = (...roles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return next(new HttpError(401, "Authentification requise"));
  if (!roles.includes(user.role)) return next(new HttpError(403, "Accès refusé"));
  next();
};

/** Identifiant de l'auteur d'une action, lu dans le jeton vérifié. */
export const authorOf = (req: Request): string | undefined => (req as AuthenticatedRequest).user?.id;
