import express from "express";
import cors from "cors";
import helmet from "helmet";
import proxyRoutes from "./routes/proxy.routes";
import docsRoutes from "./routes/docs.routes";
import { errorHandler } from "./middlewares/error-handler";
import { globalRateLimiter } from "./middlewares/rate-limiter";
import env from "./config/env";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(globalRateLimiter);

// ⚠️ Pas de express.json() global ici : le proxy doit transmettre
// le body BRUT aux microservices, qui le parseront eux-mêmes.
// Ajouter express.json() avant le proxy casse le streaming du body.

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// Documentation Swagger et Index des services
app.use("/", docsRoutes);

// Routes Proxy vers les microservices
app.use("/", proxyRoutes);

// Route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "ROUTE_NOT_FOUND", message: `Route ${req.originalUrl} introuvable` },
  });
});

app.use(errorHandler);

export default app;
