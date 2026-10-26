// Lecture des utilisateurs pour retrouver le bénéficiaire nommé dans un fichier d'import
const userServiceUrl = () => process.env.USER_SERVICE_URL || "http://localhost:4002/api";
const TIMEOUT_MS = 10_000;
// Appels de service à service : le secret partagé remplace le jeton utilisateur (lecture seule)
const internalHeaders = () => ({ "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN ?? "" });

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface NamedResource {
  id: string;
  name: string;
}

const listNamed = async (path: string): Promise<NamedResource[]> => {
  const response = await fetch(`${userServiceUrl()}${path}`, { headers: internalHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`user-service a répondu ${response.status}`);
  const body = (await response.json()) as { data?: NamedResource[] };
  return (body.data ?? []).map(({ id, name }) => ({ id, name }));
};

export const userServiceClient = {
  listDepartments: () => listNamed("/departments"),
  listPositions: () => listNamed("/positions"),

  // Une seule lecture par import ; la correspondance des noms se fait ensuite en mémoire
  listUsers: async (): Promise<UserSummary[]> => {
    const response = await fetch(`${userServiceUrl()}/users`, { headers: internalHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`user-service a répondu ${response.status}`);
    const body = (await response.json()) as { data?: UserSummary[] };
    return (body.data ?? []).map(({ id, firstName, lastName, isActive }) => ({ id, firstName, lastName, isActive }));
  },
};
