export const METRICS = {
  EQUIPMENT_TOTAL: "equipment_total",
  EQUIPMENT_BY_STATUS: "equipment_by_status",
  EQUIPMENT_BY_CATEGORY: "equipment_by_category",
  EQUIPMENT_AVAILABLE_BY_CATEGORY: "equipment_available_by_category",
  ASSIGNMENT_ACTIVE: "assignment_active",
  ASSIGNMENT_ACTIVE_BY_TYPE: "assignment_active_by_type",
} as const;

export interface CounterDelta {
  metric: string;
  dimension: string;
  label?: string | null;
  delta: number;
}

export interface EquipmentSnapshot {
  status: string;
  categoryId: string;
  categoryName?: string | null;
}

export interface AssignmentSnapshot {
  assigneeType: string;
}

export interface DomainEvent {
  eventId: string;
  type: string;
  data: Record<string, any>;
}

// Compteurs auxquels contribue un équipement dans un état donné
const equipmentContributions = (e: EquipmentSnapshot, delta: number): CounterDelta[] => {
  const counters: CounterDelta[] = [
    { metric: METRICS.EQUIPMENT_TOTAL, dimension: "", delta },
    { metric: METRICS.EQUIPMENT_BY_STATUS, dimension: e.status, delta },
    { metric: METRICS.EQUIPMENT_BY_CATEGORY, dimension: e.categoryId, label: e.categoryName, delta },
  ];
  if (e.status === "AVAILABLE") {
    counters.push({ metric: METRICS.EQUIPMENT_AVAILABLE_BY_CATEGORY, dimension: e.categoryId, label: e.categoryName, delta });
  }
  return counters;
};

// Compteurs auxquels contribue une affectation active
const assignmentContributions = (a: AssignmentSnapshot, delta: number): CounterDelta[] => [
  { metric: METRICS.ASSIGNMENT_ACTIVE, dimension: "", delta },
  { metric: METRICS.ASSIGNMENT_ACTIVE_BY_TYPE, dimension: a.assigneeType, delta },
];

// Additionne les deltas par compteur et retire ceux qui s'annulent (ex: changement de nom seul)
const mergeDeltas = (deltas: CounterDelta[]) => {
  const merged = new Map<string, CounterDelta>();
  for (const d of deltas) {
    const key = `${d.metric}\u0000${d.dimension}`;
    const current = merged.get(key);
    if (current) {
      current.delta += d.delta;
      current.label = d.label ?? current.label;
    } else {
      merged.set(key, { ...d });
    }
  }
  return [...merged.values()].filter((d) => d.delta !== 0);
};

/** Traduit un événement métier en variations de compteurs (vide si l'événement n'impacte pas les KPIs). */
export const deltasForEvent = (event: DomainEvent): CounterDelta[] => {
  const { before, after } = event.data ?? {};
  switch (event.type) {
    case "equipment.created":
    case "equipment.updated":
    case "equipment.deleted":
      return mergeDeltas([
        ...(before ? equipmentContributions(before, -1) : []),
        ...(after ? equipmentContributions(after, +1) : []),
      ]);
    case "assignment.created":
      return assignmentContributions(event.data as AssignmentSnapshot, +1);
    case "assignment.transferred":
    case "assignment.returned":
      return assignmentContributions(event.data as AssignmentSnapshot, -1);
    default:
      return [];
  }
};

/** Calcule l'ensemble des compteurs à partir de l'état complet (resynchronisation). */
export const countersFromState = (equipments: EquipmentSnapshot[], activeAssignments: AssignmentSnapshot[]) => {
  const counters = mergeDeltas([
    ...equipments.flatMap((e) => equipmentContributions(e, +1)),
    ...activeAssignments.flatMap((a) => assignmentContributions(a, +1)),
  ]);
  // Les totaux sont toujours présents, même à zéro : ils signalent que la synchronisation a eu lieu
  for (const metric of [METRICS.EQUIPMENT_TOTAL, METRICS.ASSIGNMENT_ACTIVE]) {
    if (!counters.some((c) => c.metric === metric)) counters.push({ metric, dimension: "", delta: 0 });
  }
  return counters;
};
