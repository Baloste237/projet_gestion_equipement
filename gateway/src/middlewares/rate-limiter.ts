import rateLimit from "express-rate-limit";
import { ERROR_CODES } from "../errors/error-codes";

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requêtes par IP sur la fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: ERROR_CODES.TOO_MANY_REQUESTS.message,
    },
  },
});

// Plus strict spécifiquement sur /auth/login pour limiter le brute-force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Trop de tentatives de connexion, réessayez dans 15 minutes",
    },
  },
});

// Fiche publique d'équipement (QR code, sans connexion) : limite par IP pour empêcher l'énumération d'identifiants.
// Assez large pour un inventaire où l'on scanne beaucoup d'étiquettes depuis un même poste.
export const publicRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.PUBLIC_RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Trop de requêtes, réessayez dans quelques minutes",
    },
  },
});
