import axios from "axios";
import { throwError } from "../errors/throw-error";

const equipmentServiceApi = axios.create({
  baseURL: process.env.EQUIPMENT_SERVICE_URL || "http://localhost:4003/api",
  timeout: 5000,
});

// Les appels groupés portent sur jusqu'à 200 équipements (audit et événements publiés pour chacun)
const BATCH_TIMEOUT_MS = 20_000;
const BATCH_ATTEMPTS = 2;

export interface EquipmentSummary {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
}

export interface StatusConflict {
  id: string;
  reason: "NOT_FOUND" | "STATUS_MISMATCH";
  status?: string;
}

export type BatchStatusResult = { ok: true } | { ok: false; conflicts: StatusConflict[] };

export const equipmentServiceClient = {
  getEquipmentById: async (equipmentId: string) => {
    try {
      const response = await equipmentServiceApi.get(`/equipments/${equipmentId}`);
      return response.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) throwError("EQUIPMENT_NOT_FOUND");
      throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
    }
  },

  updateEquipmentStatus: async (equipmentId: string, status: string) => {
    try {
      const response = await equipmentServiceApi.patch(`/equipments/${equipmentId}`, { status });
      return response.data.data;
    } catch (err: any) {
      throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
    }
  },

  // Lit N équipements en un appel ; les identifiants inconnus sont absents du résultat
  lookup: async (ids: string[]): Promise<EquipmentSummary[]> => {
    try {
      const response = await equipmentServiceApi.post("/equipments/lookup", { ids }, { timeout: BATCH_TIMEOUT_MS });
      return response.data.data;
    } catch (err: any) {
      throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
      return [];
    }
  },

  // Change le statut de N équipements, tout ou rien. Un refus (409) est renvoyé tel quel et n'est pas rejoué ;
  // les pannes (réseau, 5xx) sont rejouées une fois avant d'être signalées.
  updateStatusBatch: async (ids: string[], from: string, to: string, performedBy?: string): Promise<BatchStatusResult> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= BATCH_ATTEMPTS; attempt++) {
      try {
        await equipmentServiceApi.post(
          "/equipments/status/batch",
          { ids, from, to },
          { timeout: BATCH_TIMEOUT_MS, headers: performedBy ? { "x-user-id": performedBy } : undefined }
        );
        return { ok: true };
      } catch (err: any) {
        if (err.response?.status === 409) {
          return { ok: false, conflicts: Array.isArray(err.response.data?.details) ? err.response.data.details : [] };
        }
        lastError = err;
      }
    }
    console.error("[equipment-client] Échec du changement de statut groupé:", (lastError as Error)?.message);
    return throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
  },
};
