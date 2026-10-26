import env from "./env";

export interface ServiceRoute {
  path: string;
  target: string;
  requiresAuth: boolean;
  rewritePath?: string; // Optionnel : si le microservice utilise un préfixe différent (ex: /api/users)
}

export const SERVICES_CONFIG: ServiceRoute[] = [
  {
    path: "/auth",
    target: env.AUTH_SERVICE_URL,
    requiresAuth: false, // auth-service gère lui-même ce qui est public/privé
  },
  {
    path: "/users",
    target: env.USER_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/users",
  },
  {
    path: "/departments",
    target: env.USER_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/departments",
  },
  {
    path: "/positions",
    target: env.USER_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/positions",
  },
  {
    path: "/equipments",
    target: env.EQUIPMENT_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/equipments",
  },
  {
    path: "/categories",
    target: env.EQUIPMENT_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/categories",
  },
  {
    path: "/suppliers",
    target: env.EQUIPMENT_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/suppliers",
  },
  {
    path: "/assignments",
    target: env.ASSIGNMENT_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/assignments",
  },
  {
    path: "/inventories",
    target: env.INVENTORY_SERVICE_URL,
    requiresAuth: true,
  },
  {
    path: "/dashboard",
    target: env.INVENTORY_SERVICE_URL,
    requiresAuth: true,
    rewritePath: "/api/dashboard",
  },
  {
    path: "/audit-logs",
    target: env.AUDIT_SERVICE_URL,
    requiresAuth: true,
  },
  {
    // Fiche publique d'un équipement (scan du QR code) : seule route équipement sans authentification
    path: "/public",
    target: env.EQUIPMENT_SERVICE_URL,
    requiresAuth: false,
    rewritePath: "/api/public",
  },
  {
    path: "/uploads/equipments",
    target: env.EQUIPMENT_SERVICE_URL,
    requiresAuth: false,
    rewritePath: "/uploads/equipments",
  },
  {
    path: "/uploads/avatars",
    target: env.USER_SERVICE_URL,
    requiresAuth: false,
    rewritePath: "/uploads/avatars",
  },
];
export default SERVICES_CONFIG;
