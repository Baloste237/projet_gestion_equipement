import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./Config/swagger";
import { errorHandler } from "./middlewares/error-handler";
import userRoutes from "./Routes/user.routes";
import departmentRoutes from "./Routes/department.routes";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Documentation Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// Serving uploaded avatars static files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
