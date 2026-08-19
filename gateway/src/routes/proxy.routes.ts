import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { SERVICES_CONFIG } from "../config/services.config";
import { authenticate } from "../middlewares/authenticate";
import { authRateLimiter } from "../middlewares/rate-limiter";

const router = Router();

SERVICES_CONFIG.forEach(({ path, target, requiresAuth, rewritePath }) => {
  const middlewares: any[] = [];

  // Rate limit spécifique pour les routes d'authentification sensibles
  if (path === "/auth") {
    middlewares.push(authRateLimiter);
  }

  if (requiresAuth) {
    middlewares.push(authenticate);
  }

  router.use(
    path,
    ...middlewares,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: (url: string) => {
        const base = rewritePath || path;
        // Re-préfixe le chemin pour contrecarrer la suppression automatique d'Express
        // Ex: / (pour /users) devient /api/users
        // Ex: /b28d446d (pour /users/b28d446d) devient /api/users/b28d446d
        if (url === "/" || url === "") {
          return base;
        }
        return base + url;
      },
      on: {
        error: (err, req, res) => {
          console.error(`[Gateway Proxy Error] ${path} →`, err.message);
          const response = res as import("express").Response;
          response.status(503).json({
            success: false,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: `Le service correspondant à ${path} est momentanément indisponible`,
            },
          });
        },
      },
    })
  );
});

export default router;
