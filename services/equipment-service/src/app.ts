import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import { errorHandler } from "./middlewares/error-handler";
import equipmentRoutes from "./Routes/equipmenT.routes";
import categoryRoutes from "./Routes/category.routes";
import supplierRoutes from "./Routes/supplier.routes";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Documentation Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// Routes
app.use("/api/equipments", equipmentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);

// Gestionnaire d'erreurs global
app.use(errorHandler);

export default app;
