import type { Assignment, AssigneeInfo, AssigneeType } from '../services/api';

// Agrégations du tableau de bord : fonctions pures, testables sans navigateur.

export const percentOf = (value: number, total: number): number => (total > 0 ? Math.round((value / total) * 100) : 0);

export const OTHERS_LABEL = 'Autres';
export const UNKNOWN_DEPARTMENT_LABEL = 'Département inconnu';
export const NO_DEPARTMENT_LABEL = 'Sans département';

export interface CountRow {
  label: string;
  count: number;
}

// Département auquel se rattache une affectation : celui du département bénéficiaire,
// du poste, ou de l'utilisateur bénéficiaire
export const departmentOfAssignment = (assignment: Pick<Assignment, 'assigneeType' | 'assignee' | 'user'>): string => {
  const type: AssigneeType = assignment.assigneeType ?? 'USER';
  const assignee: AssigneeInfo | null | undefined = assignment.assignee ?? (type === 'USER' ? assignment.user : null);
  if (!assignee) return UNKNOWN_DEPARTMENT_LABEL;
  if (type === 'DEPARTMENT') return assignee.name || UNKNOWN_DEPARTMENT_LABEL;
  return assignee.department?.name || (type === 'USER' ? NO_DEPARTMENT_LABEL : UNKNOWN_DEPARTMENT_LABEL);
};

/**
 * Équipements actuellement affectés, par département (affectations ACTIVE uniquement),
 * du plus doté au moins doté ; au-delà de `limit` lignes, le reste est regroupé dans « Autres ».
 */
export const groupAssignmentsByDepartment = (
  assignments: Pick<Assignment, 'status' | 'assigneeType' | 'assignee' | 'user'>[],
  limit = 8
): CountRow[] => {
  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    if (assignment.status !== 'ACTIVE') continue;
    const label = departmentOfAssignment(assignment);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));

  if (rows.length <= limit) return rows;
  const kept = rows.slice(0, limit);
  const others = rows.slice(limit).reduce((sum, row) => sum + row.count, 0);
  return [...kept, { label: OTHERS_LABEL, count: others }];
};

export interface TrendBucket {
  /** Libellé court de l'axe : jour (28/09) ou début de semaine */
  label: string;
  /** Libellé complet pour l'infobulle */
  fullLabel: string;
  created: number;
  returned: number;
}

const DAY_MS = 86_400_000;
const utcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const shortDate = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Regroupement par jour jusqu'à 31 jours, par semaine au-delà */
export const bucketSizeDays = (days: number): number => (days <= 31 ? 1 : 7);

/**
 * Affectations créées (assignedAt) et restitutions (returnInfo.returnDate) sur les `days` derniers jours,
 * jour de `now` inclus, regroupées par jour ou par semaine. Les événements hors période sont ignorés.
 * Les buckets sont ancrés sur la fin de la période : le dernier contient toujours `now`.
 */
export const buildAssignmentTrend = (
  assignments: Pick<Assignment, 'assignedAt' | 'returnInfo'>[],
  days: number,
  now: Date = new Date()
): TrendBucket[] => {
  const size = bucketSizeDays(days);
  const bucketCount = Math.ceil(days / size);
  const end = utcDay(now) + DAY_MS; // borne exclusive : demain 00h00 UTC
  const start = end - bucketCount * size * DAY_MS;

  const buckets: TrendBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const from = start + index * size * DAY_MS;
    const to = from + size * DAY_MS - DAY_MS;
    return {
      label: shortDate(from),
      fullLabel: size === 1 ? shortDate(from) : `${shortDate(from)} au ${shortDate(to)}`,
      created: 0,
      returned: 0,
    };
  });

  const indexOf = (value: string | null | undefined) => {
    if (!value) return -1;
    const time = new Date(value).getTime();
    if (Number.isNaN(time) || time < start || time >= end) return -1;
    return Math.floor((time - start) / (size * DAY_MS));
  };

  for (const assignment of assignments) {
    const created = indexOf(assignment.assignedAt);
    if (created >= 0) buckets[created].created += 1;
    const returned = indexOf(assignment.returnInfo?.returnDate);
    if (returned >= 0) buckets[returned].returned += 1;
  }
  return buckets;
};
