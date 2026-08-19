import env from "./env";

const SERVICES = [
  { name: "Auth", url: `${env.AUTH_SERVICE_URL}/api-docs.json` },
  { name: "User", url: `${env.USER_SERVICE_URL}/api-docs.json` },
  { name: "Equipment", url: `${env.EQUIPMENT_SERVICE_URL}/api-docs.json` },
  { name: "Assignment", url: `${env.ASSIGNMENT_SERVICE_URL}/api-docs.json` },
  { name: "Inventory", url: `${env.INVENTORY_SERVICE_URL}/api-docs.json` },
  { name: "Audit", url: `${env.AUDIT_SERVICE_URL}/api-docs.json` },
];

export const buildAggregatedSpec = async () => {
  const specs = await Promise.all(
    SERVICES.map(async (s) => {
      try {
        const response = await fetch(s.url, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) return null;
        return (await response.json()) as Record<string, any>;
      } catch {
        return null;
      }
    })
  );

  const merged: Record<string, any> = {
    openapi: "3.0.0",
    info: {
      title: "Gestion Équipements - API complète",
      version: "1.0.0",
      description: "Documentation centralisée de l'ensemble des microservices via l'API Gateway",
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: "API Gateway" }],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };

  specs.forEach((spec) => {
    if (!spec) return;
    if (spec.paths) {
      Object.assign(merged.paths, spec.paths);
    }
    if (spec.components?.schemas) {
      Object.assign(merged.components.schemas, spec.components.schemas);
    }
    if (spec.components?.securitySchemes) {
      Object.assign(merged.components.securitySchemes, spec.components.securitySchemes);
    }
  });

  return merged;
};
