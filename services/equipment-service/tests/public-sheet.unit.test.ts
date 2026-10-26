import assert from "node:assert";
import { AddressInfo } from "node:net";
import { test, describe, before, beforeEach, after } from "node:test";
import type { Server } from "node:http";

const KNOWN = "11111111-1111-4111-8111-111111111111";
const UNKNOWN = "99999999-9999-4999-8999-999999999999";
const SECRET = "secret-interne-de-test";

process.env.INTERNAL_SERVICE_TOKEN = SECRET;

const equipment = {
  id: KNOWN,
  name: "Portable Dell",
  serialNumber: "SN-0001",
  status: "ASSIGNED",
  condition: "NON_FONCTIONNEL",
  categoryId: "c1",
  category: { id: "c1", name: "Informatique" },
  supplierId: "s1",
  supplier: { id: "s1", name: "Dell France", contactInfo: "contact@dell.example" },
  imageUrl: "/uploads/equipments/portable.png",
  barcode: "3700000000011",
  brand: "Dell",
  model: "Latitude 5440",
  location: "Siège - Bureau 12",
  purchaseDate: new Date("2026-03-15T00:00:00Z"),
  purchasePrice: "1249.90",
  warrantyEndDate: new Date("2029-03-15T00:00:00Z"),
  commissionedAt: new Date("2024-01-10T00:00:00Z"),
  decommissionedAt: null,
  notes: "Note interne confidentielle",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
};

let server: Server;
let base: string;
let assignmentBehavior: "assigned" | "unassigned" | "down" | "refused" | "slow";
let internalHeaders: (string | null)[];
const realFetch = globalThis.fetch;

before(async () => {
  const { equipmentRepository } = await import("../src/repositories/equipment.repository");
  equipmentRepository.findById = (async (id: string) => (id === KNOWN ? equipment : null)) as any;

  // Seuls les appels vers assignment-service sont simulés ; les appels vers l'application elle-même passent
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    if (!url.includes("/assignments/internal/active/")) return realFetch(input, init);
    internalHeaders.push(new Headers(init?.headers).get("x-internal-token"));
    if (assignmentBehavior === "down") throw new Error("ECONNREFUSED");
    if (assignmentBehavior === "refused") return new Response("interdit", { status: 403 });
    if (assignmentBehavior === "unassigned") return Response.json({ data: null });
    return Response.json({ data: { assigneeType: "USER", assigneeName: "Chi George Mofor" } });
  }) as typeof fetch;

  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/equipments`;
});
after(() => {
  globalThis.fetch = realFetch;
  server.close();
});
beforeEach(() => {
  assignmentBehavior = "assigned";
  internalHeaders = [];
});

describe("Fiche publique : contenu", () => {
  test("répond sans authentification avec les informations d'identification et de service", async () => {
    const response = await fetch(`${base}/${KNOWN}`);
    assert.strictEqual(response.status, 200);
    const { data } = await response.json();
    assert.strictEqual(data.name, "Portable Dell");
    assert.strictEqual(data.category, "Informatique");
    assert.strictEqual(data.serialNumber, "SN-0001");
    assert.strictEqual(data.status, "ASSIGNED");
    assert.strictEqual(data.condition, "NON_FONCTIONNEL");
    assert.strictEqual(data.location, "Siège - Bureau 12");
    assert.strictEqual(data.commissionedAt, "2024-01-10T00:00:00.000Z");
    assert.strictEqual(data.decommissionedAt, null);
    assert.strictEqual(data.warrantyEndDate, "2029-03-15T00:00:00.000Z");
  });

  test("n'expose ni prix, ni fournisseur, ni notes, ni date d'achat, ni identifiants", async () => {
    const text = await (await fetch(`${base}/${KNOWN}`)).text();
    const { data } = JSON.parse(text);
    for (const forbidden of ["purchasePrice", "supplier", "supplierId", "notes", "purchaseDate", "id", "categoryId", "createdAt"]) {
      assert.ok(!(forbidden in data), `champ exposé : ${forbidden}`);
    }
    for (const secret of ["1249.90", "Dell France", "contact@dell.example", "Note interne confidentielle"]) {
      assert.ok(!text.includes(secret), `valeur exposée : ${secret}`);
    }
  });

  test("le seul jeu de champs autorisé est la liste blanche", async () => {
    const { data } = await (await fetch(`${base}/${KNOWN}`)).json();
    assert.deepStrictEqual(Object.keys(data).sort(), [
      "assignee",
      "barcode",
      "brand",
      "category",
      "commissionedAt",
      "condition",
      "decommissionedAt",
      "imageUrl",
      "location",
      "model",
      "name",
      "serialNumber",
      "status",
      "warrantyEndDate",
    ]);
  });
});

describe("Fiche publique : bénéficiaire", () => {
  test("indique le nom du bénéficiaire actuel et transmet le secret interne", async () => {
    const { data } = await (await fetch(`${base}/${KNOWN}`)).json();
    assert.deepStrictEqual(data.assignee, { state: "ASSIGNED", type: "USER", name: "Chi George Mofor" });
    assert.deepStrictEqual(internalHeaders, [SECRET]);
  });

  test("indique que l'équipement n'est pas affecté", async () => {
    assignmentBehavior = "unassigned";
    const { data } = await (await fetch(`${base}/${KNOWN}`)).json();
    assert.deepStrictEqual(data.assignee, { state: "UNASSIGNED" });
  });

  test("assignment-service en panne ou qui refuse : la fiche est servie, bénéficiaire indisponible", async () => {
    for (const behavior of ["down", "refused"] as const) {
      assignmentBehavior = behavior;
      const response = await fetch(`${base}/${KNOWN}`);
      assert.strictEqual(response.status, 200, behavior);
      const { data } = await response.json();
      assert.deepStrictEqual(data.assignee, { state: "UNAVAILABLE" }, behavior);
      assert.strictEqual(data.name, "Portable Dell");
    }
  });
});

describe("Fiche publique : équipement inconnu", () => {
  test("un identifiant inexistant et un identifiant mal formé reçoivent la même réponse 404", async () => {
    const inexistant = await fetch(`${base}/${UNKNOWN}`);
    const malForme = await fetch(`${base}/pas-un-uuid`);
    const injection = await fetch(`${base}/${encodeURIComponent("1' OR '1'='1")}`);
    assert.strictEqual(inexistant.status, 404);
    assert.strictEqual(malForme.status, 404);
    assert.strictEqual(injection.status, 404);
    const bodies = await Promise.all([inexistant.text(), malForme.text(), injection.text()]);
    assert.strictEqual(new Set(bodies).size, 1);
    assert.match(bodies[0], /Équipement introuvable/);
  });

  test("aucun appel à assignment-service pour un équipement inconnu", async () => {
    await fetch(`${base}/${UNKNOWN}`);
    await fetch(`${base}/pas-un-uuid`);
    assert.strictEqual(internalHeaders.length, 0);
  });
});
