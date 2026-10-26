import assert from "node:assert";
import { test, describe } from "node:test";
import { createEquipmentSchema, updateEquipmentSchema } from "../src/validators/equipment.validator";
import { toEquipmentSnapshot } from "../src/clients/event-publisher.client";

const base = { name: "Portable", serialNumber: "SN-001", categoryId: "11111111-1111-4111-8111-111111111111" };

describe("État de fonctionnement et dates de service (validation)", () => {
  test("l'état vaut FONCTIONNEL par défaut", () => {
    assert.strictEqual(createEquipmentSchema.parse(base).condition, "FONCTIONNEL");
  });

  test("accepte NON_FONCTIONNEL et refuse toute autre valeur", () => {
    assert.strictEqual(createEquipmentSchema.parse({ ...base, condition: "NON_FONCTIONNEL" }).condition, "NON_FONCTIONNEL");
    assert.strictEqual(createEquipmentSchema.safeParse({ ...base, condition: "CASSE" }).success, false);
    assert.strictEqual(updateEquipmentSchema.safeParse({ condition: "OK" }).success, false);
  });

  test("conserve des dates cohérentes", () => {
    const parsed = createEquipmentSchema.parse({ ...base, commissionedAt: "2024-01-10", decommissionedAt: "2025-06-30" });
    assert.strictEqual(parsed.commissionedAt?.toISOString().slice(0, 10), "2024-01-10");
    assert.strictEqual(parsed.decommissionedAt?.toISOString().slice(0, 10), "2025-06-30");
  });

  test("refuse une mise hors service antérieure à la mise en service", () => {
    const data = { commissionedAt: "2025-06-30", decommissionedAt: "2024-01-10" };
    assert.strictEqual(createEquipmentSchema.safeParse({ ...base, ...data }).success, false);
    assert.strictEqual(updateEquipmentSchema.safeParse(data).success, false);
  });

  test("les dates sont facultatives", () => {
    assert.strictEqual(createEquipmentSchema.safeParse({ ...base, decommissionedAt: null }).success, true);
    assert.strictEqual(updateEquipmentSchema.safeParse({ decommissionedAt: "2025-01-01" }).success, true);
  });
});

describe("Instantané publié avec les événements d'équipement", () => {
  test("contient l'état et les dates de service", () => {
    const snapshot = toEquipmentSnapshot({
      status: "AVAILABLE",
      categoryId: "c1",
      category: { name: "Informatique" },
      condition: "NON_FONCTIONNEL",
      commissionedAt: new Date("2024-01-10T00:00:00Z"),
      decommissionedAt: null,
    });
    assert.strictEqual(snapshot.condition, "NON_FONCTIONNEL");
    assert.strictEqual(snapshot.commissionedAt, "2024-01-10T00:00:00.000Z");
    assert.strictEqual(snapshot.decommissionedAt, null);
  });

  test("l'état par défaut est FONCTIONNEL", () => {
    assert.strictEqual(toEquipmentSnapshot({ status: "AVAILABLE", categoryId: "c1" }).condition, "FONCTIONNEL");
  });
});
