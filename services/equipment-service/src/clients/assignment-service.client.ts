// Affectation groupée d'équipements à un utilisateur (route POST /assignments/bulk d'assignment-service)
const assignmentServiceUrl = () => process.env.ASSIGNMENT_SERVICE_URL || "http://localhost:4004/api";
// Un appel porte sur 200 équipements au plus (audit et événements publiés pour chacun)
const TIMEOUT_MS = 20_000;

export type BulkAssignResult =
  | { ok: true }
  // `refused` : le service a répondu et refusé (droits, équipement indisponible...) ; sinon panne
  | { ok: false; refused: boolean; message: string };

export interface ActiveAssignment {
  equipmentId: string;
  assigneeType: "USER" | "DEPARTMENT" | "POSITION";
  assigneeId: string;
}

// Bénéficiaire actuel tel que la fiche publique le présente
export type PublicAssignee =
  | { state: "ASSIGNED"; type: "USER" | "DEPARTMENT" | "POSITION"; name: string | null }
  | { state: "UNASSIGNED" }
  // Le service ne répond pas, ou refuse : la fiche s'affiche quand même
  | { state: "UNAVAILABLE" };

// Délai court : la fiche publique ne doit pas attendre un service lent
const PUBLIC_LOOKUP_TIMEOUT_MS = 3_000;

export const assignmentServiceClient = {
  /** Route interne d'assignment-service, réservée aux services par le secret partagé INTERNAL_SERVICE_TOKEN */
  getPublicAssignee: async (equipmentId: string): Promise<PublicAssignee> => {
    try {
      const response = await fetch(`${assignmentServiceUrl()}/assignments/internal/active/${equipmentId}`, {
        headers: { "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN ?? "" },
        signal: AbortSignal.timeout(PUBLIC_LOOKUP_TIMEOUT_MS),
      });
      if (!response.ok) return { state: "UNAVAILABLE" };
      const { data } = (await response.json()) as { data: { assigneeType: "USER" | "DEPARTMENT" | "POSITION"; assigneeName: string | null } | null };
      return data ? { state: "ASSIGNED", type: data.assigneeType, name: data.assigneeName } : { state: "UNASSIGNED" };
    } catch {
      return { state: "UNAVAILABLE" };
    }
  },

  /** Affectations actives (une entrée par équipement affecté), lues avec le jeton de l'appelant */
  listActive: async (authorization: string): Promise<ActiveAssignment[]> => {
    const response = await fetch(`${assignmentServiceUrl()}/assignments/active-summary`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`assignment-service a répondu ${response.status}`);
    return ((await response.json()) as { data?: ActiveAssignment[] }).data ?? [];
  },

  /** Le jeton de l'appelant est relayé : ses droits (assignment:create) et son identité (audit) s'appliquent */
  assignBulk: async (
    equipmentIds: string[],
    userId: string,
    authorization: string,
    notes: string
  ): Promise<BulkAssignResult> => {
    try {
      const response = await fetch(`${assignmentServiceUrl()}/assignments/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify({ assigneeType: "USER", assigneeId: userId, equipmentIds, notes }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return { ok: true };
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = body.error?.message ?? `assignment-service a répondu ${response.status}`;
      return { ok: false, refused: response.status < 500, message };
    } catch (err) {
      return { ok: false, refused: false, message: (err as Error).message };
    }
  },

  purgeAll: async (): Promise<void> => {
    try {
      await fetch(`${assignmentServiceUrl()}/assignments/internal/purge`, {
        method: "POST",
        headers: { "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN ?? "" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.warn("[assignmentServiceClient] purgeAll failed or unreachable:", err);
    }
  },
};
