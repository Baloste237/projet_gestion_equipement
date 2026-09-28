import { equipmentServiceClient } from "../clients/equipment-service.client";
import { assignmentServiceClient } from "../clients/assignment-service.client";
import { kpiRepository } from "../repositories/kpi.repository";
import { countersFromState } from "../kpi/kpi.metrics";

const rebuild = async () => {
  const [equipments = [], assignments = []] = await Promise.all([
    equipmentServiceClient.getAllEquipments(),
    assignmentServiceClient.getAllAssignments(),
  ]);
  const activeAssignments = assignments.filter((a: any) => a.status === "ACTIVE");

  await kpiRepository.replaceAll(
    countersFromState(
      equipments.map((e: any) => ({ status: e.status, categoryId: e.categoryId, categoryName: e.category?.name ?? null })),
      activeAssignments.map((a: any) => ({ assigneeType: a.assigneeType }))
    )
  );
  return { equipmentCount: equipments.length, activeAssignmentCount: activeAssignments.length };
};

export const kpiSyncService = {
  /** Recalcule tous les compteurs depuis equipment-service et assignment-service. */
  rebuild,

  /** Premier démarrage : initialise les compteurs à partir des données existantes. */
  seedIfEmpty: async () => {
    if (!(await kpiRepository.isEmpty())) return false;
    await rebuild();
    return true;
  },
};
