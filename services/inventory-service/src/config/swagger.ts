import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Inventory Service API",
      version: "1.0.0",
      description: "Gestion des campagnes d'inventaire et vérification des équipements",
    },
    servers: [
      { url: "http://localhost:4005", description: "Direct (dev)" },
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
        Inventory: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "Inventaire Annuel 2026" },
            status: {
              type: "string",
              enum: ["IN_PROGRESS", "COMPLETED"],
              example: "IN_PROGRESS",
            },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        InventoryItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            inventoryId: { type: "string", format: "uuid" },
            equipmentId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["PENDING", "CHECKED", "MISSING"],
              example: "PENDING",
            },
            found: { type: "boolean", example: true },
            note: { type: "string", nullable: true, example: "Équipement en bon état" },
            checkedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        CreateInventoryDTO: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string", example: "Inventaire Q1 2026" },
          },
        },
        AddInventoryItemDTO: {
          type: "object",
          required: ["equipmentId"],
          properties: {
            equipmentId: { type: "string", format: "uuid" },
          },
        },
        CheckInventoryItemDTO: {
          type: "object",
          required: ["found"],
          properties: {
            found: { type: "boolean", example: true },
            note: { type: "string", example: "Équipement vérifié sur place" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "INVENTORY_NOT_FOUND" },
                message: { type: "string", example: "Inventaire introuvable" },
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
