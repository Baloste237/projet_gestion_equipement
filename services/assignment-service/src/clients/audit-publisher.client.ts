interface AuditEventParams {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

const auditServiceUrl = () => process.env.AUDIT_SERVICE_URL || "http://localhost:4006";

// assignment-service n'a pas de canal d'audit dédié : envoi HTTP à audit-service, best-effort.
// Un échec est journalisé et ne fait jamais échouer l'affectation.
export const auditPublisher = {
  publish: async (params: AuditEventParams): Promise<void> => {
    try {
      const response = await fetch(`${auditServiceUrl()}/audit-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, serviceName: process.env.SERVICE_NAME || "assignment-service" }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        console.warn(`[audit-publisher] audit-service a répondu ${response.status} pour ${params.action}`);
      }
    } catch (err: any) {
      console.warn(`[audit-publisher] Échec de l'envoi de ${params.action}:`, err.message);
    }
  },
};
