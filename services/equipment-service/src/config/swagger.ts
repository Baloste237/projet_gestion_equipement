import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Equipment Service API",
      version: "1.0.0",
      description: "Gestion des équipements, catégories et fournisseurs",
    },
    servers: [
      { url: "http://localhost:4003", description: "Direct (dev)" },
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
        Equipment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Latitude 5540" },
            serialNumber: { type: "string", example: "SN-2026-001" },
            status: {
              type: "string",
              enum: ["AVAILABLE", "ASSIGNED", "IN_MAINTENANCE", "RETIRED"],
              example: "AVAILABLE",
            },
            categoryId: { type: "string", format: "uuid" },
            supplierId: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateEquipmentDTO: {
          type: "object",
          required: ["name", "serialNumber", "categoryId"],
          properties: {
            name: { type: "string", example: "Latitude 5540" },
            serialNumber: { type: "string", example: "SN-2026-001" },
            categoryId: { type: "string", format: "uuid" },
            supplierId: { type: "string", format: "uuid" },
          },
        },
        UpdateEquipmentDTO: {
          type: "object",
          properties: {
            name: { type: "string", example: "Latitude 5540" },
            serialNumber: { type: "string", example: "SN-2026-001" },
            status: {
              type: "string",
              enum: ["AVAILABLE", "ASSIGNED", "IN_MAINTENANCE", "RETIRED"],
            },
            categoryId: { type: "string", format: "uuid" },
            supplierId: { type: "string", format: "uuid" },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Informatique" },
            description: { type: "string", example: "Matériel informatique et ordinateurs" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateCategoryDTO: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Informatique" },
            description: { type: "string", example: "Matériel informatique et ordinateurs" },
          },
        },
        Supplier: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Dell France" },
            contactInfo: { type: "string", example: "contact@dell.fr" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateSupplierDTO: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Dell France" },
            contactInfo: { type: "string", example: "contact@dell.fr" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "EQUIPMENT_NOT_FOUND" },
                message: { type: "string", example: "Équipement introuvable" },
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
