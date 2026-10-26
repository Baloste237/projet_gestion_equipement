import assert from "node:assert";
import { test, describe } from "node:test";
import { countersFromState, deltasForEvent, METRICS } from "../src/kpi/kpi.metrics";

const event = (type: string, data: Record<string, unknown>) => ({ eventId: "e-1", type, data });
const asMap = (deltas: { metric: string; dimension: string; delta: number }[]) =>
  Object.fromEntries(deltas.map((d) => [`${d.metric}/${d.dimension}`, d.delta]));

describe("Variations des KPIs par événement", () => {
  test("equipment.created incrémente total, statut et catégorie (dont disponibles)", () => {
    const deltas = asMap(
      deltasForEvent(event("equipment.created", { after: { status: "AVAILABLE", categoryId: "cat-1", categoryName: "PC" } }))
    );
    assert.deepStrictEqual(deltas, {
      [`${METRICS.EQUIPMENT_TOTAL}/`]: 1,
      [`${METRICS.EQUIPMENT_BY_STATUS}/AVAILABLE`]: 1,
      [`${METRICS.EQUIPMENT_BY_CATEGORY}/cat-1`]: 1,
      [`${METRICS.EQUIPMENT_AVAILABLE_BY_CATEGORY}/cat-1`]: 1,
    });
  });

  test("equipment.updated (AVAILABLE -> ASSIGNED) ne touche ni au total ni à la catégorie", () => {
    const deltas = asMap(
      deltasForEvent(
        event("equipment.updated", {
          before: { status: "AVAILABLE", categoryId: "cat-1" },
          after: { status: "ASSIGNED", categoryId: "cat-1" },
        })
      )
    );
    assert.deepStrictEqual(deltas, {
      [`${METRICS.EQUIPMENT_BY_STATUS}/AVAILABLE`]: -1,
      [`${METRICS.EQUIPMENT_BY_STATUS}/ASSIGNED`]: 1,
      [`${METRICS.EQUIPMENT_AVAILABLE_BY_CATEGORY}/cat-1`]: -1,
    });
  });

  test("equipment.deleted décrémente les compteurs de l'état précédent", () => {
    const deltas = asMap(deltasForEvent(event("equipment.deleted", { before: { status: "RETIRED", categoryId: "cat-2" } })));
    assert.deepStrictEqual(deltas, {
      [`${METRICS.EQUIPMENT_TOTAL}/`]: -1,
      [`${METRICS.EQUIPMENT_BY_STATUS}/RETIRED`]: -1,
      [`${METRICS.EQUIPMENT_BY_CATEGORY}/cat-2`]: -1,
    });
  });

  test("affectations : création +1, transfert/retour -1 par type d'assigné", () => {
    assert.deepStrictEqual(asMap(deltasForEvent(event("assignment.created", { assigneeType: "DEPARTMENT" }))), {
      [`${METRICS.ASSIGNMENT_ACTIVE}/`]: 1,
      [`${METRICS.ASSIGNMENT_ACTIVE_BY_TYPE}/DEPARTMENT`]: 1,
    });
    for (const type of ["assignment.transferred", "assignment.returned"]) {
      assert.deepStrictEqual(asMap(deltasForEvent(event(type, { assigneeType: "USER" }))), {
        [`${METRICS.ASSIGNMENT_ACTIVE}/`]: -1,
        [`${METRICS.ASSIGNMENT_ACTIVE_BY_TYPE}/USER`]: -1,
      });
    }
  });

  test("un événement inconnu n'a aucun effet", () => {
    assert.deepStrictEqual(deltasForEvent(event("equipment.transferred", {})), []);
  });
});

describe("Resynchronisation", () => {
  test("recalcule les compteurs depuis l'état complet", () => {
    const counters = asMap(
      countersFromState(
        [
          { status: "AVAILABLE", categoryId: "cat-1", categoryName: "PC" },
          { status: "ASSIGNED", categoryId: "cat-1", categoryName: "PC" },
        ],
        [{ assigneeType: "USER" }]
      )
    );
    assert.strictEqual(counters[`${METRICS.EQUIPMENT_TOTAL}/`], 2);
    assert.strictEqual(counters[`${METRICS.EQUIPMENT_BY_CATEGORY}/cat-1`], 2);
    assert.strictEqual(counters[`${METRICS.EQUIPMENT_AVAILABLE_BY_CATEGORY}/cat-1`], 1);
    assert.strictEqual(counters[`${METRICS.ASSIGNMENT_ACTIVE_BY_TYPE}/USER`], 1);
  });

  test("les totaux existent même sans données", () => {
    assert.deepStrictEqual(asMap(countersFromState([], [])), {
      [`${METRICS.EQUIPMENT_TOTAL}/`]: 0,
      [`${METRICS.ASSIGNMENT_ACTIVE}/`]: 0,
    });
  });
});
