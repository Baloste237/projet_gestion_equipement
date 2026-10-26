import { AppError } from "../errors/app-error";

// Comptes de connexion : auth-service est la source de vérité du rôle et de l'état actif.
// Les routes /internal/credentials exigent le secret partagé et ne passent jamais par le gateway.
const baseUrl = () => process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const TIMEOUT_MS = 5000;

export interface Credential {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface CredentialPatch {
  role?: string;
  isActive?: boolean;
}

const unavailable = () =>
  new AppError("AUTH_SERVICE_UNAVAILABLE", 502, "Service d'authentification indisponible : modification non appliquée");

const headers = () => ({
  "Content-Type": "application/json",
  "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN || "",
});

const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
  try {
    return await fetch(`${baseUrl()}/internal/credentials${path}`, {
      ...init,
      headers: headers(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw unavailable();
  }
};

export const authServiceClient = {
  /** Compte portant cet e-mail (casse ignorée), ou null s'il n'existe pas. Une panne lève une erreur 502. */
  findByEmail: async (email: string): Promise<Credential | null> => {
    const response = await call(`/by-email/${encodeURIComponent(email)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw unavailable();
    return ((await response.json()) as { data: Credential }).data;
  },

  /** Modifie le rôle et/ou l'état du compte. Le refus « dernier administrateur » (409) est relayé tel quel. */
  update: async (id: string, patch: CredentialPatch): Promise<Credential> => {
    const response = await call(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (response.ok) return ((await response.json()) as { data: Credential }).data;

    const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    if (response.status === 409) {
      throw new AppError(body.code || "ACCOUNT_CONFLICT", 409, body.message || "Modification refusée par le service d'authentification");
    }
    if (response.status === 404) {
      throw new AppError("CREDENTIAL_NOT_FOUND", 409, "Le compte lié à cette fiche n'existe plus");
    }
    throw unavailable();
  },

  /** Vérifie le mot de passe de l'utilisateur authentifié (via son jeton Bearer). Retourne false en cas de panne. */
  verifyPassword: async (authorization: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl()}/auth/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
