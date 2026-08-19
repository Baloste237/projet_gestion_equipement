import { Router, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { buildAggregatedSpec } from "../config/swagger-aggregator";
import env from "../config/env";

const router = Router();

// Endpoint JSON de la spécification agrégée
router.get("/api-docs.json", async (_req: Request, res: Response) => {
  const spec = await buildAggregatedSpec();
  res.json(spec);
});

// Page HTML d'index des microservices (option simple d'accès direct)
router.get("/services-docs", (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Documentation API - Gestion Équipements</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; background-color: #f8fafc; color: #0f172a; }
          h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
          .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-top: 1rem; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 0.75rem 0; }
          a { color: #2563eb; text-decoration: none; font-weight: 500; font-size: 1.1rem; }
          a:hover { text-decoration: underline; }
          .badge { display: inline-block; padding: 0.25rem 0.5rem; background: #e0e7ff; color: #3730a3; border-radius: 4px; font-size: 0.85rem; margin-left: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Documentation des Microservices</h1>
          <p>Consultez la documentation Swagger unifiée ou accédez directement aux interfaces individuelles de chaque service :</p>
          <ul>
            <li><a href="/api-docs"><strong>🔥 Swagger Gateway Agrégé (Vue unifiée)</strong></a></li>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 1rem 0;">
            <li><a href="${env.AUTH_SERVICE_URL}/api-docs" target="_blank">Auth Service</a> <span class="badge">Port 4001</span></li>
            <li><a href="${env.USER_SERVICE_URL}/api-docs" target="_blank">User Service</a> <span class="badge">Port 4002</span></li>
            <li><a href="${env.EQUIPMENT_SERVICE_URL}/api-docs" target="_blank">Equipment Service</a> <span class="badge">Port 4003</span></li>
            <li><a href="${env.ASSIGNMENT_SERVICE_URL}/api-docs" target="_blank">Assignment Service</a> <span class="badge">Port 4004</span></li>
            <li><a href="${env.INVENTORY_SERVICE_URL}/api-docs" target="_blank">Inventory Service</a> <span class="badge">Port 4005</span></li>
            <li><a href="${env.AUDIT_SERVICE_URL}/api-docs" target="_blank">Audit Service</a> <span class="badge">Port 4006</span></li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Swagger UI agrégé sur /api-docs
router.use("/api-docs", swaggerUi.serve, async (req: Request, res: Response) => {
  const spec = await buildAggregatedSpec();
  const html = swaggerUi.generateHTML(spec);
  res.send(html);
});

export default router;
