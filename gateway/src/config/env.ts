import dotenv from "dotenv";
dotenv.config();

const requiredEnv = [
  "PORT",
  "JWT_SECRET",
  "AUTH_SERVICE_URL",
  "USER_SERVICE_URL",
  "EQUIPMENT_SERVICE_URL",
  "ASSIGNMENT_SERVICE_URL",
  "INVENTORY_SERVICE_URL",
  "AUDIT_SERVICE_URL",
];

// Secret de signature des jetons : obligatoire, aucune valeur de repli (le gateway refuse de démarrer sans lui)
if (!process.env.JWT_SECRET) {
  throw new Error("Variable d'environnement JWT_SECRET obligatoire");
}

for (const variable of requiredEnv) {
  if (!process.env[variable]) {
    console.warn(`[Warning] Environment variable ${variable} is not set in Gateway. Using fallback.`);
  }
}

export const env = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET as string,
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:4002",
  EQUIPMENT_SERVICE_URL: process.env.EQUIPMENT_SERVICE_URL || "http://localhost:4003",
  ASSIGNMENT_SERVICE_URL: process.env.ASSIGNMENT_SERVICE_URL || "http://localhost:4004",
  INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || "http://localhost:4005",
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || "http://localhost:4006",
  // Nombre de proxys de confiance devant le gateway (0 en local ; 1 derrière le proxy de l'hébergeur)
  TRUST_PROXY_HOPS: Number(process.env.TRUST_PROXY_HOPS) || 0,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
};
export default env;
