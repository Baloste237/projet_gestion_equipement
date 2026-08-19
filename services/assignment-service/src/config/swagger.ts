import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Assignment Service API",
      version: "1.0.0",
      description: "Gestion des affectations, transferts et restitutions d'équipements",
    },
    servers: [
      { url: "http://localhost:4004", description: "Direct (dev)" },
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
        Assignment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            equipmentId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            assignedBy: { type: "string", format: "uuid" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time", nullable: true },
            status: {
              type: "string",
              enum: ["ACTIVE", "TRANSFERRED", "RETURNED"],
              example: "ACTIVE",
            },
            notes: { type: "string", example: "Matériel confié pour télétravail" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateAssignmentDTO: {
          type: "object",
          required: ["equipmentId", "userId"],
          properties: {
            equipmentId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            notes: { type: "string", example: "Matériel confié pour télétravail" },
          },
        },
        CreateTransferDTO: {
          type: "object",
          required: ["toUserId"],
          properties: {
            toUserId: { type: "string", format: "uuid" },
            reason: { type: "string", example: "Changement d'équipe" },
          },
        },
        CreateReturnDTO: {
          type: "object",
          required: ["condition"],
          properties: {
            condition: {
              type: "string",
              enum: ["GOOD", "DAMAGED", "LOST"],
              example: "GOOD",
            },
            note: { type: "string", example: "Retour suite à fin de contrat" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "ASSIGNMENT_NOT_FOUND" },
                message: { type: "string", example: "Affectation introuvable" },
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
