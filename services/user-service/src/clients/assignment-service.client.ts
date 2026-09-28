import { AppError } from "../errors/app-error";

const baseUrl = () => process.env.ASSIGNMENT_SERVICE_URL || "http://localhost:4004/api";

const unavailable = () =>
  new AppError("ASSIGNMENT_SERVICE_UNAVAILABLE", 503, "Service d'affectation indisponible");

export const assignmentServiceClient = {
  // Nombre d'affectations actives d'un poste. Le jeton de l'appelant est relayé :
  // assignment-service authentifie lui-même ses requêtes.
  countActiveForPosition: async (positionId: string, authorization?: string): Promise<number> => {
    const query = new URLSearchParams({ assigneeType: "POSITION", assigneeId: positionId, status: "ACTIVE" });
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}/assignments?${query}`, {
        headers: authorization ? { Authorization: authorization } : {},
        signal: AbortSignal.timeout(5000),
      });
    } catch (_) {
      throw unavailable();
    }
    if (!response.ok) throw unavailable();

    const body = (await response.json()) as { data?: unknown[] };
    return Array.isArray(body.data) ? body.data.length : 0;
  },
};
