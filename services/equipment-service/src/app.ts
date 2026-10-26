import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import { errorHandler } from "./middlewares/error-handler";
import { authenticate, authenticateOrInternal } from "./middlewares/security";
import equipmentRoutes from "./routes/equipmenT.routes";
import categoryRoutes from "./routes/category.routes";
import supplierRoutes from "./routes/supplier.routes";
import publicRoutes from "./routes/public.routes";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Documentation Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// Static files for uploaded equipment images
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
// Chaque service vérifie lui-même le jeton ; seule la fiche publique (QR code) reste ouverte.
// Les équipements acceptent aussi le secret interne, sur quelques routes (voir isInternalRoute).
app.use("/api/equipments", authenticateOrInternal, equipmentRoutes);
app.use("/api/categories", authenticate, categoryRoutes);
app.use("/api/suppliers", authenticate, supplierRoutes);
app.use("/api/public", publicRoutes);

// Gestionnaire d'erreurs global
app.use(errorHandler);

export default app;
