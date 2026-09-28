import { prisma } from "../config/prisma";
import { CounterDelta, DomainEvent } from "../kpi/kpi.metrics";

export const kpiRepository = {
  isEmpty: async () => (await prisma.kpiCounter.count()) === 0,

  findAll: () => prisma.kpiCounter.findMany(),

  // Applique un événement une seule fois : l'enregistrement de son id et la mise à jour des compteurs sont atomiques
  applyEvent: (event: DomainEvent, deltas: CounterDelta[]) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.processedEvent.createMany({
        data: [{ eventId: event.eventId, type: event.type }],
        skipDuplicates: true,
      });
      if (count === 0) return false;

      for (const { metric, dimension, label, delta } of deltas) {
        await tx.kpiCounter.upsert({
          where: { metric_dimension: { metric, dimension } },
          create: { metric, dimension, label: label ?? null, value: delta },
          update: { value: { increment: delta }, ...(label ? { label } : {}) },
        });
      }
      return true;
    }),

  // Remplace tous les compteurs (resynchronisation complète)
  replaceAll: (counters: CounterDelta[]) =>
    prisma.$transaction([
      prisma.kpiCounter.deleteMany(),
      prisma.kpiCounter.createMany({
        data: counters.map(({ metric, dimension, label, delta }) => ({
          metric,
          dimension,
          label: label ?? null,
          value: delta,
        })),
      }),
    ]),
};
