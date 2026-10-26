import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, beforeEach } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";
// Routes privées : jeton signé exigé par le service lui-même
const authHeader = { Authorization: `Bearer ${jwt.sign({ id: "user-1", role: "EMPLOYE", permissions: [] }, "test-secret", { expiresIn: "5m" })}` };


const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const UNKNOWN = "99999999-9999-4999-8999-999999999999";

type Row = { id: string; name: string; serialNumber: string; status: string; categoryId: string; category: { name: string } };
const row = (id: string, status: string): Row => ({
  id,
  name: `Équipement ${id.slice(0, 2)}`,
  serialNumber: `SN-${id.slice(0, 2)}`,
  status,
  categoryId: "cat-1",
  category: { name: "Informatique" },
});

// Base simulée : l'annulation d'une transaction restaure l'état initial
let rows: Row[] = [];
let interfere: (() => void) | null = null;
let snapshot: Row[] | null = null;
// Modification validée par une autre transaction : elle survit à l'annulation de la transaction en cours
const externalChange = (id: string, status: string) => {
  rows.find((r) => r.id === id)!.status = status;
  snapshot?.find((r) => r.id === id) && (snapshot.find((r) => r.id === id)!.status = status);
};
let published: { type: string; data: any }[] = [];
let audits: any[] = [];

const inList = (where: any) => (r: Row) => where.id.in.includes(r.id) && (where.status === undefined || r.status === where.status);
const fakeDelegate = {
  findMany: async ({ where }: any) => rows.filter(inList(where)).map((r) => ({ ...r })),
  updateMany: async ({ where, data }: any) => {
    interfere?.();
    const targets = rows.filter(inList(where));
    targets.forEach((r) => Object.assign(r, data));
    return { count: targets.length };
  },
};

let validators: typeof import("../src/validators/equipment.validator");
let repo: typeof import("../src/repositories/equipment.repository")["equipmentRepository"];
let service: typeof import("../src/services/equipment.service")["equipmentService"];

before(async () => {
  const { prisma } = await import("../src/config/prisma");
  Object.defineProperty(prisma, "equipment", { value: fakeDelegate, configurable: true });
  (prisma as any).$transaction = async (fn: (tx: any) => Promise<unknown>) => {
    snapshot = rows.map((r) => ({ ...r }));
    try {
      return await fn({ equipment: fakeDelegate });
    } catch (err) {
      rows = snapshot!;
      throw err;
    } finally {
      snapshot = null;
    }
  };

  validators = await import("../src/validators/equipment.validator");
  repo = (await import("../src/repositories/equipment.repository")).equipmentRepository;
  service = (await import("../src/services/equipment.service")).equipmentService;
  const { eventPublisher } = await import("../src/clients/event-publisher.client");
  const { auditPublisher } = await import("../src/clients/audit-publisher.client");
  eventPublisher.publish = ((type: string, data: any) => void published.push({ type, data })) as any;
  auditPublisher.publish = (async (event: any) => void audits.push(event)) as any;
});

beforeEach(() => {
  rows = [row(A, "AVAILABLE"), row(B, "AVAILABLE"), row(C, "ASSIGNED")];
  interfere = null;
  published = [];
  audits = [];
});

describe("Validation des routes groupées", () => {
  test("lookup : accepte 1 à 200 uuid distincts, refuse vide, doublon, invalide et plus de 200", () => {
    const { lookupEquipmentsSchema: schema } = validators;
    assert.strictEqual(schema.safeParse({ ids: [A] }).success, true);
    assert.strictEqual(schema.safeParse({ ids: [] }).success, false);
    assert.strictEqual(schema.safeParse({ ids: [A, A] }).success, false);
    assert.strictEqual(schema.safeParse({ ids: ["pas-un-uuid"] }).success, false);
    const many = Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    assert.strictEqual(schema.safeParse({ ids: many }).success, false);
    assert.strictEqual(schema.safeParse({ ids: many.slice(0, 200) }).success, true);
  });

  test("status/batch : statuts connus et différents", () => {
    const { batchStatusSchema: schema } = validators;
    assert.strictEqual(schema.safeParse({ ids: [A], from: "AVAILABLE", to: "ASSIGNED" }).success, true);
    assert.strictEqual(schema.safeParse({ ids: [A], from: "AVAILABLE", to: "PERDU" }).success, false);
    assert.strictEqual(schema.safeParse({ ids: [A], from: "AVAILABLE", to: "AVAILABLE" }).success, false);
  });
});

describe("Changement de statut groupé : repository", () => {
  test("modifie tous les équipements quand tous sont au statut de départ", async () => {
    const result = await repo.updateStatusIfAll([A, B], "AVAILABLE", "ASSIGNED");
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(rows.map((r) => r.status), ["ASSIGNED", "ASSIGNED", "ASSIGNED"]);
  });

  test("ne modifie rien quand un équipement n'a pas le bon statut, et le signale", async () => {
    const result: any = await repo.updateStatusIfAll([A, C], "AVAILABLE", "ASSIGNED");
    assert.strictEqual(result.ok, false);
    assert.deepStrictEqual(result.conflicts, [{ id: C, reason: "STATUS_MISMATCH", status: "ASSIGNED" }]);
    assert.deepStrictEqual(rows.map((r) => r.status), ["AVAILABLE", "AVAILABLE", "ASSIGNED"]);
  });

  test("signale plusieurs défauts à la fois, dont un équipement introuvable", async () => {
    const result: any = await repo.updateStatusIfAll([A, UNKNOWN, C], "AVAILABLE", "ASSIGNED");
    assert.deepStrictEqual(
      result.conflicts.map((c: any) => [c.id, c.reason]),
      [[UNKNOWN, "NOT_FOUND"], [C, "STATUS_MISMATCH"]]
    );
  });

  test("changement concurrent entre la lecture et l'écriture : transaction annulée, défaut signalé", async () => {
    // B passe à IN_MAINTENANCE juste avant l'écriture conditionnelle
    interfere = () => {
      externalChange(B, "IN_MAINTENANCE");
      interfere = null;
    };
    const result: any = await repo.updateStatusIfAll([A, B], "AVAILABLE", "ASSIGNED");
    assert.strictEqual(result.ok, false);
    assert.deepStrictEqual(result.conflicts, [{ id: B, reason: "STATUS_MISMATCH", status: "IN_MAINTENANCE" }]);
    // A n'a pas été gardé en ASSIGNED : la transaction est annulée
    assert.strictEqual(rows.find((r) => r.id === A)!.status, "AVAILABLE");
  });
});

describe("Changement de statut groupé : service", () => {
  test("publie l'audit et l'événement (avant/après) pour chaque équipement modifié", async () => {
    const result = await service.updateStatusBatch([A, B], "AVAILABLE", "ASSIGNED", "user-42");
    assert.deepStrictEqual(result, { updatedCount: 2, ids: [A, B] });
    assert.strictEqual(audits.length, 2);
    assert.ok(audits.every((a) => a.action === "EQUIPMENT_UPDATED" && a.performedBy === "user-42"));
    assert.strictEqual(published.length, 2);
    assert.ok(published.every((e) => e.type === "equipment.updated" && e.data.before.status === "AVAILABLE" && e.data.after.status === "ASSIGNED"));
  });

  test("en cas de refus : erreur 409 avec la liste, aucun événement ni audit", async () => {
    await assert.rejects(service.updateStatusBatch([A, C], "AVAILABLE", "ASSIGNED"), (err: any) => {
      assert.strictEqual(err.statusCode, 409);
      assert.deepStrictEqual(err.details, [{ id: C, reason: "STATUS_MISMATCH", status: "ASSIGNED" }]);
      return true;
    });
    assert.strictEqual(published.length, 0);
    assert.strictEqual(audits.length, 0);
  });

  test("lookup : renvoie les équipements trouvés et omet les inconnus", async () => {
    const found = await service.lookup([A, UNKNOWN, C]);
    assert.deepStrictEqual(found.map((e) => [e.id, e.status]), [[A, "AVAILABLE"], [C, "ASSIGNED"]]);
  });
});

describe("Routes HTTP /api/equipments/lookup et /status/batch", () => {
  let base: string;
  before(async () => {
    const app = (await import("../src/app")).default;
    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    server.unref();
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/equipments`;
  });

  const post = async (path: string, body: unknown) => {
    const res = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader }, body: JSON.stringify(body) });
    return { status: res.status, body: (await res.json()) as any };
  };

  test("POST /lookup : 200 avec les équipements, 400 si la liste est invalide", async () => {
    const ok = await post("/lookup", { ids: [A, B, UNKNOWN] });
    assert.strictEqual(ok.status, 200);
    assert.deepStrictEqual(ok.body.data.map((e: any) => e.id), [A, B]);
    assert.strictEqual((await post("/lookup", { ids: [] })).status, 400);
  });

  test("POST /status/batch : 200 en cas de succès, 409 avec les détails sinon, 400 si le corps est invalide", async () => {
    const conflict = await post("/status/batch", { ids: [A, C], from: "AVAILABLE", to: "ASSIGNED" });
    assert.strictEqual(conflict.status, 409);
    assert.strictEqual(conflict.body.details[0].id, C);
    assert.strictEqual(rows.find((r) => r.id === A)!.status, "AVAILABLE");

    const ok = await post("/status/batch", { ids: [A, B], from: "AVAILABLE", to: "ASSIGNED" });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.body.data.updatedCount, 2);

    assert.strictEqual((await post("/status/batch", { ids: [A], from: "AVAILABLE", to: "AVAILABLE" })).status, 400);
  });
});
