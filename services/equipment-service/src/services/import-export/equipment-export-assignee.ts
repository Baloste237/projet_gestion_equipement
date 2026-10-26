import { assignmentServiceClient } from "../../clients/assignment-service.client";
import { userServiceClient } from "../../clients/user-service.client";

// Nom de l'assigné actuel de chaque équipement affecté (clé : identifiant d'équipement).
// Meilleur effort : un service injoignable vide la colonne, il ne fait jamais échouer l'export.
export const loadAssigneeNames = async (authorization: string | undefined) => {
  const names = new Map<string, string>();
  if (!authorization) return names;

  let active;
  try {
    active = await assignmentServiceClient.listActive(authorization);
  } catch (err) {
    console.error("[export] Affectations illisibles, colonne bénéficiaire vide:", (err as Error).message);
    return names;
  }
  if (!active.length) return names;

  const attempt = async <T>(read: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await read();
    } catch (err) {
      console.error("[export] Lecture user-service impossible:", (err as Error).message);
      return [];
    }
  };
  const [users, departments, positions] = await Promise.all([
    attempt(() => userServiceClient.listUsers()),
    attempt(() => userServiceClient.listDepartments()),
    attempt(() => userServiceClient.listPositions()),
  ]);

  const nameById = {
    USER: new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()])),
    DEPARTMENT: new Map(departments.map((d) => [d.id, d.name])),
    POSITION: new Map(positions.map((p) => [p.id, p.name])),
  };
  for (const { equipmentId, assigneeType, assigneeId } of active) {
    const name = nameById[assigneeType]?.get(assigneeId);
    if (name) names.set(equipmentId, name);
  }
  return names;
};
