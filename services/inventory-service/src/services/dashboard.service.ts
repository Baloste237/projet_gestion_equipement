import { kpiRepository } from "../repositories/kpi.repository";
import { inventoryRepository } from "../repositories/inventory.repository";
import { METRICS } from "../kpi/kpi.metrics";

const ASSIGNEE_TYPES = ["USER", "DEPARTMENT", "POSITION"];

export const dashboardService = {
  // Lecture des compteurs matérialisés : aucun recalcul sur les données des autres services
  getKpis: async () => {
    const [counters, inventoriesInProgress] = await Promise.all([
      kpiRepository.findAll(),
      inventoryRepository.countInProgress(),
    ]);

    const valueOf = (metric: string, dimension = "") =>
      counters.find((c) => c.metric === metric && c.dimension === dimension)?.value ?? 0;
    const byDimension = (metric: string) =>
      Object.fromEntries(counters.filter((c) => c.metric === metric).map((c) => [c.dimension, c.value]));

    const byCategory = counters
      .filter((c) => c.metric === METRICS.EQUIPMENT_BY_CATEGORY && c.value > 0)
      .map((c) => ({
        categoryId: c.dimension,
        name: c.label,
        total: c.value,
        available: valueOf(METRICS.EQUIPMENT_AVAILABLE_BY_CATEGORY, c.dimension),
      }))
      .sort((a, b) => b.total - a.total || (a.name ?? "").localeCompare(b.name ?? ""));

    const updatedAt = counters.reduce<Date | null>(
      (latest, c) => (!latest || c.updatedAt > latest ? c.updatedAt : latest),
      null
    );

    return {
      equipments: {
        total: valueOf(METRICS.EQUIPMENT_TOTAL),
        byStatus: byDimension(METRICS.EQUIPMENT_BY_STATUS),
        byCategory,
      },
      assignments: {
        active: valueOf(METRICS.ASSIGNMENT_ACTIVE),
        byAssigneeType: Object.fromEntries(
          ASSIGNEE_TYPES.map((type) => [type, valueOf(METRICS.ASSIGNMENT_ACTIVE_BY_TYPE, type)])
        ),
      },
      inventories: { inProgress: inventoriesInProgress },
      synchronized: counters.length > 0,
      updatedAt,
    };
  },
};
