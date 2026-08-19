import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "User Service API",
      version: "1.0.0",
      description: "Gestion des utilisateurs, profils et départements",
    },
    servers: [
      { url: "http://localhost:4002", description: "Direct (dev)" },
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
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            firstName: { type: "string", example: "Jean" },
            lastName: { type: "string", example: "Dupont" },
            email: { type: "string", format: "email", example: "jean.dupont@example.com" },
            role: {
              type: "string",
              enum: ["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"],
              example: "EMPLOYE",
            },
            isActive: { type: "boolean", example: true },
            authUserId: { type: "string", format: "uuid" },
            departmentId: { type: "string", format: "uuid", nullable: true },
            avatarUrl: { type: "string", nullable: true, example: "/uploads/avatar-123.jpg" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateUserDTO: {
          type: "object",
          required: ["firstName", "lastName", "email", "authUserId"],
          properties: {
            firstName: { type: "string", example: "Jean" },
            lastName: { type: "string", example: "Dupont" },
            email: { type: "string", format: "email", example: "jean.dupont@example.com" },
            authUserId: { type: "string", format: "uuid" },
            role: {
              type: "string",
              enum: ["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"],
            },
            departmentId: { type: "string", format: "uuid" },
            avatarUrl: { type: "string" },
          },
        },
        UpdateProfileDTO: {
          type: "object",
          properties: {
            firstName: { type: "string", example: "Jean" },
            lastName: { type: "string", example: "Dupont" },
            avatarUrl: { type: "string" },
          },
        },
        UpdateRoleDTO: {
          type: "object",
          required: ["role"],
          properties: {
            role: {
              type: "string",
              enum: ["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"],
            },
            departmentId: { type: "string", format: "uuid" },
          },
        },
        Department: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ressources Humaines" },
            description: { type: "string", example: "Gestion du personnel" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateDepartmentDTO: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Ressources Humaines" },
            description: { type: "string", example: "Gestion du personnel" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "USER_NOT_FOUND" },
                message: { type: "string", example: "Utilisateur introuvable" },
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
