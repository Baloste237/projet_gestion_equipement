import { assignmentServiceClient } from "../../clients/assignment-service.client";
import { userServiceClient, UserSummary } from "../../clients/user-service.client";
import { EquipmentDraft, normalizeHeader } from "./equipment-row.mapper";

export const ASSIGN_BATCH_SIZE = 200;
export const AUTO_ASSIGN_NOTE = "Affectation automatique à l'import";

export type UnassignedReason =
  | "USER_NOT_FOUND"
  | "USER_AMBIGUOUS"
  | "USER_INACTIVE"
  | "EQUIPMENT_TO_COMPLETE"
  | "ASSIGNMENT_REFUSED"
  | "ASSIGNMENT_UNAVAILABLE";

export interface UnassignedRow {
  row: number;
  assigneeName: string;
  reason: UnassignedReason;
  /** Nombre d'équipements de la ligne concernés */
  count: number;
}

// « Mofor, Chi George » et « chi george MOFOR » donnent la même clé : casse, accents, ponctuation et ordre ignorés
export const personKey = (name: string) => normalizeHeader(name).split(" ").filter(Boolean).sort().join(" ");

export type NameResolution =
  | { status: "FOUND"; userId: string }
  | { status: "NOT_FOUND" | "AMBIGUOUS" | "INACTIVE" };

export const resolveNames = (names: string[], users: UserSummary[]): Map<string, NameResolution> => {
  const usersByKey = new Map<string, UserSummary[]>();
  for (const user of users) {
    const key = personKey(`${user.firstName} ${user.lastName}`);
    usersByKey.set(key, [...(usersByKey.get(key) ?? []), user]);
  }
  const resolutions = new Map<string, NameResolution>();
  for (const name of new Set(names)) {
    const matches = usersByKey.get(personKey(name)) ?? [];
    if (!matches.length) resolutions.set(name, { status: "NOT_FOUND" });
    else if (matches.length > 1) resolutions.set(name, { status: "AMBIGUOUS" });
    else if (!matches[0].isActive) resolutions.set(name, { status: "INACTIVE" });
    else resolutions.set(name, { status: "FOUND", userId: matches[0].id });
  }
  return resolutions;
};

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

interface CreatedEquipment {
  id: string;
  serialNumber: string;
}

/**
 * Affecte les équipements créés à l'utilisateur nommé dans leur ligne, sans jamais remettre en cause l'import :
 * tout ce qui ne peut pas l'être est rapporté avec sa raison.
 * Les équipements du même bénéficiaire partent ensemble (lots de 200, chaque lot tout ou rien).
 */
export const autoAssign = async (
  drafts: EquipmentDraft[],
  equipments: CreatedEquipment[],
  authorization: string | undefined
) => {
  const idBySerial = new Map(equipments.map((e) => [e.serialNumber, e.id]));
  const named = drafts.filter((d) => d.assigneeName);
  const assignedIds = new Set<string>();
  const unassigned = new Map<string, UnassignedRow>();

  const skip = (draft: EquipmentDraft, reason: UnassignedReason) => {
    const key = `${draft.sourceRow}:${reason}`;
    const entry = unassigned.get(key) ?? { row: draft.sourceRow, assigneeName: draft.assigneeName!, reason, count: 0 };
    entry.count++;
    unassigned.set(key, entry);
  };
  const report = () => ({ assignedIds, unassigned: [...unassigned.values()].sort((a, b) => a.row - b.row) });

  if (!named.length) return report();

  let users: UserSummary[] | null = null;
  try {
    users = await userServiceClient.listUsers();
  } catch (err) {
    console.error("[import] Lecture des utilisateurs impossible:", (err as Error).message);
  }
  if (!users || !authorization) {
    named.forEach((d) => skip(d, "ASSIGNMENT_UNAVAILABLE"));
    return report();
  }

  const resolutions = resolveNames(named.map((d) => d.assigneeName!), users);
  const toAssign = new Map<string, EquipmentDraft[]>();
  const failureReason = { NOT_FOUND: "USER_NOT_FOUND", AMBIGUOUS: "USER_AMBIGUOUS", INACTIVE: "USER_INACTIVE" } as const;
  for (const draft of named) {
    const resolution = resolutions.get(draft.assigneeName!)!;
    if (resolution.status !== "FOUND") skip(draft, failureReason[resolution.status]);
    else if (draft.status !== "AVAILABLE") skip(draft, "EQUIPMENT_TO_COMPLETE");
    else toAssign.set(resolution.userId, [...(toAssign.get(resolution.userId) ?? []), draft]);
  }

  for (const [userId, userDrafts] of toAssign) {
    for (const batch of chunk(userDrafts, ASSIGN_BATCH_SIZE)) {
      const ids = batch.map((d) => idBySerial.get(d.serialNumber)!);
      const result = await assignmentServiceClient.assignBulk(ids, userId, authorization, AUTO_ASSIGN_NOTE);
      if (result.ok) ids.forEach((id) => assignedIds.add(id));
      else {
        console.error("[import] Affectation automatique refusée:", result.message);
        batch.forEach((d) => skip(d, result.refused ? "ASSIGNMENT_REFUSED" : "ASSIGNMENT_UNAVAILABLE"));
      }
    }
  }
  return report();
};
