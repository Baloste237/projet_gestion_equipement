import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Audit Service API",
      version: "1.0.0",
      description: "Consultation des journaux d'audit et d'événements système",
    },
    servers: [
      { url: "http://localhost:4006", description: "Direct (dev)" },
      { url: "http://localhost:4000", description: "Via API Gateway" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            action: { type: "string", example: "EQUIPMENT_CREATED" },
            entity: { type: "string", example: "Equipment" },
            entityId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            details: { type: "object", example: { name: "Latitude 5540" } },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "AUDIT_LOG_NOT_FOUND" },
                message: { type: "string", example: "Journal d'audit introuvable" },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./src/Routes/*.ts"],
});

export default swaggerSpec;
