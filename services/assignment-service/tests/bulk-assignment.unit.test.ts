import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";
import jwt from "jsonwebtoken";

const DEPARTMENT_ID = "11111111-1111-4111-8111-111111111111";
const POSITION_ID = "22222222-2222-4222-8222-222222222222"; // inactif
const UNKNOWN_ID = "33333333-3333-4333-8333-333333333333";
const EQ = ["a1111111-1111-4111-8111-111111111111", "a2222222-2222-4222-8222-222222222222", "a3333333-3333-4333-8333-333333333333"];
const EQ_MISSING = "a9999999-9999-4999-8999-999999999999";

process.env.JWT_SECRET = "secret-de-test";
// Garde-fou : ces tests ne doivent jamais joindre le vrai audit-service de la machine
process.env.AUDIT_SERVICE_URL = "http://127.0.0.1:1";

const fakeUserService = http.createServer((req, res) => {
  const known: Record<string, object> = {
    [`/api/departments/${DEPARTMENT_ID}`]: { id: DEPARTMENT_ID, name: "IT", isActive: true },
    [`/api/positions/${POSITION_ID}`]: { id: POSITION_ID, name: "Dev", isActive: false },
  };
  const body = known[req.url ?? ""];
  res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body ? { success: true, data: body } : { success: false }));
});

let validators: typeof import("../src/validators/assignment.validator");
let service: typeof import("../src/Services/assignment.service")["assignmentService"];
let repo: typeof import("../src/Repositories/assignment.repository")["assignmentRepository"];
let equipmentClient: typeof import("../src/clients/equipment-service.client")["equipmentServiceClient"];

// État des doublures
let equipmentStatuses: Record<string, string>;
let createdRecords: Record<string, any>[];
let deletedIds: string[][];
let batchCalls: { ids: string[]; from: string; to: string; performedBy?: string }[];
let lookupCalls: string[][];
let events: { type: string; data: any }[];
let audits: any[];
let createManyError: unknown;
let batchBehavior: "ok" | "conflict" | "down";

before(async () => {
  await new Promise<void>((resolve) => fakeUserService.listen(0, resolve));
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${(fakeUserService.address() as AddressInfo).port}/api`;

  validators = await import("../src/validators/assignment.validator");
  service = (await import("../src/Services/assignment.service")).assignmentService;
  repo = (await import("../src/Repositories/assignment.repository")).assignmentRepository;
  equipmentClient = (await import("../src/clients/equipment-service.client")).equipmentServiceClient;
  const { eventPublisher } = await import("../src/clients/event-publisher.client");
  const { auditPublisher } = await import("../src/clients/audit-publisher.client");
  const { AppError } = await import("../src/errors/app-error");

  equipmentClient.lookup = async (ids: string[]) => {
    lookupCalls.push(ids);
    return ids.filter((id) => id in equipmentStatuses).map((id) => ({ id, name: `Équipement ${id.slice(0, 2)}`, serialNumber: `SN-${id.slice(0, 2)}`, status: equipmentStatuses[id] }));
  };
  equipmentClient.updateStatusBatch = async (ids, from, to, performedBy) => {
    batchCalls.push({ ids, from, to, performedBy });
    if (batchBehavior === "down") throw new AppError("EQUIPMENT_SERVICE_UNAVAILABLE");
    if (batchBehavior === "conflict") return { ok: false, conflicts: [{ id: ids[1], reason: "STATUS_MISMATCH", status: "IN_MAINTENANCE" }] };
    return { ok: true };
  };
  repo.createMany = (async (records: Record<string, any>[]) => {
    if (createManyError) throw createManyError;
    createdRecords.push(...records);
    return records.map((r, i) => ({ id: `asg-${i + 1}`, ...r }));
  }) as any;
  repo.deleteByIds = (async (ids: string[]) => void deletedIds.push(ids)) as any;
  eventPublisher.publish = ((type: string, data: any) => void events.push({ type, data })) as any;
  auditPublisher.publish = (async (event: any) => void audits.push(event)) as any;
});

after(() => fakeUserService.close());

beforeEach(() => {
  equipmentStatuses = { [EQ[0]]: "AVAILABLE", [EQ[1]]: "AVAILABLE", [EQ[2]]: "AVAILABLE" };
  createdRecords = [];
  deletedIds = [];
  batchCalls = [];
  lookupCalls = [];
  events = [];
  audits = [];
  createManyError = null;
  batchBehavior = "ok";
});

const bulk = (equipmentIds: string[] = EQ, extra: Record<string, unknown> = {}) =>
  service.createMany({ equipmentIds, assigneeType: "DEPARTMENT", assigneeId: DEPARTMENT_ID, ...extra } as any, "user-42");

describe("Validation de l'affectation groupée", () => {
  const schema = () => validators.createBulkAssignmentSchema;
  const base = { assigneeType: "DEPARTMENT", assigneeId: DEPARTMENT_ID };

  test("accepte 1 à 200 équipements distincts et les paramètres communs", () => {
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: [EQ[0]] }).success, true);
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: EQ, notes: "n", expectedReturnDate: "2026-12-31", handoverCondition: "GOOD" }).success, true);
    const many = Array.from({ length: 200 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: many }).success, true);
  });

  test("refuse liste vide, plus de 200, doublon, type inconnu et identifiant invalide", () => {
    const many = Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: [] }).success, false);
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: many }).success, false);
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: [EQ[0], EQ[0]] }).success, false);
    assert.strictEqual(schema().safeParse({ ...base, assigneeType: "TEAM", equipmentIds: EQ }).success, false);
    assert.strictEqual(schema().safeParse({ ...base, equipmentIds: ["x"] }).success, false);
  });
});

describe("Affectation groupée : succès", () => {
  test("crée toutes les affectations, passe les statuts en un appel, publie événements et audit", async () => {
    const created = await bulk(EQ, { notes: "lot", expectedReturnDate: "2026-12-31" });

    assert.strictEqual(created.length, 3);
    assert.deepStrictEqual(createdRecords.map((r) => r.equipmentId), EQ);
    assert.ok(createdRecords.every((r) => r.status === "ACTIVE" && r.notes === "lot" && r.expectedReturnDate instanceof Date));
    assert.deepStrictEqual(batchCalls, [{ ids: EQ, from: "AVAILABLE", to: "ASSIGNED", performedBy: "user-42" }]);
    assert.strictEqual(lookupCalls.length, 1);

    assert.strictEqual(events.length, 3);
    assert.ok(events.every((e) => e.type === "assignment.created" && e.data.assigneeType === "DEPARTMENT"));
    assert.strictEqual(audits.length, 1);
    assert.strictEqual(audits[0].action, "ASSIGNMENTS_CREATED");
    assert.strictEqual(audits[0].entityType, "AssignmentBatch");
    assert.strictEqual(audits[0].performedBy, "user-42");
    assert.strictEqual(audits[0].metadata.count, 3);
    assert.deepStrictEqual(audits[0].metadata.items.map((i: any) => i.equipmentId), EQ);
  });

  test("un seul équipement : audit rattaché à l'affectation", async () => {
    await bulk([EQ[0]]);
    assert.strictEqual(audits[0].entityType, "Assignment");
    assert.strictEqual(audits[0].entityId, "asg-1");
  });
});

describe("Affectation groupée : validation tout ou rien", () => {
  test("liste tous les équipements refusés avec leur raison et ne crée rien", async () => {
    equipmentStatuses[EQ[1]] = "ASSIGNED";
    await assert.rejects(bulk([EQ[0], EQ[1], EQ_MISSING]), (err: any) => {
      assert.strictEqual(err.code, "BULK_ASSIGNMENT_REFUSED");
      assert.strictEqual(err.statusCode, 409);
      assert.deepStrictEqual(
        err.details.map((d: any) => [d.equipmentId, d.reason]),
        [[EQ[1], "NOT_AVAILABLE"], [EQ_MISSING, "NOT_FOUND"]]
      );
      assert.strictEqual(err.details[0].name, `Équipement ${EQ[1].slice(0, 2)}`);
      return true;
    });
    assert.strictEqual(createdRecords.length, 0);
    assert.strictEqual(batchCalls.length, 0);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(audits.length, 0);
  });

  test("bénéficiaire inactif : refusé avant toute lecture d'équipement", async () => {
    await assert.rejects(
      service.createMany({ equipmentIds: EQ, assigneeType: "POSITION", assigneeId: POSITION_ID } as any),
      { code: "POSITION_INACTIVE_CANNOT_ASSIGN" }
    );
    await assert.rejects(
      service.createMany({ equipmentIds: EQ, assigneeType: "DEPARTMENT", assigneeId: UNKNOWN_ID } as any),
      { code: "DEPARTMENT_NOT_FOUND" }
    );
    assert.strictEqual(lookupCalls.length, 0);
    assert.strictEqual(createdRecords.length, 0);
  });

  test("service équipement indisponible pendant la validation : rien n'est créé", async () => {
    equipmentClient.lookup = async () => {
      const { AppError } = await import("../src/errors/app-error");
      throw new AppError("EQUIPMENT_SERVICE_UNAVAILABLE");
    };
    try {
      await assert.rejects(bulk(), { code: "EQUIPMENT_SERVICE_UNAVAILABLE", statusCode: 503 });
    } finally {
      equipmentClient.lookup = async (ids: string[]) =>
        ids.filter((id) => id in equipmentStatuses).map((id) => ({ id, name: "n", serialNumber: "s", status: equipmentStatuses[id] }));
    }
    assert.strictEqual(createdRecords.length, 0);
    assert.strictEqual(events.length, 0);
  });
});

describe("Affectation groupée : concurrence et cohérence", () => {
  test("conflit d'index (équipement affecté entre-temps) : 409 et aucun changement de statut", async () => {
    createManyError = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    await assert.rejects(bulk(), { code: "EQUIPMENT_ALREADY_ASSIGNED", statusCode: 409 });
    assert.strictEqual(batchCalls.length, 0);
    assert.strictEqual(deletedIds.length, 0); // rien n'avait été enregistré : la transaction est annulée
    assert.strictEqual(events.length, 0);
    assert.strictEqual(audits.length, 0);
  });

  test("les autres erreurs d'enregistrement ne sont pas prises pour un conflit", async () => {
    createManyError = new Error("connexion perdue");
    await assert.rejects(bulk(), { message: "connexion perdue" });
  });

  test("échec du changement de statut : les affectations créées sont supprimées, ni événement ni audit", async () => {
    batchBehavior = "down";
    await assert.rejects(bulk(), { code: "EQUIPMENT_SERVICE_UNAVAILABLE", statusCode: 503 });
    assert.deepStrictEqual(deletedIds, [["asg-1", "asg-2", "asg-3"]]);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(audits.length, 0);
  });

  test("refus du changement de statut (équipement modifié entre-temps) : compensation et 409 avec la liste", async () => {
    batchBehavior = "conflict";
    await assert.rejects(bulk(), (err: any) => {
      assert.strictEqual(err.code, "BULK_ASSIGNMENT_REFUSED");
      assert.deepStrictEqual(err.details, [{ equipmentId: EQ[1], reason: "NOT_AVAILABLE" }]);
      return true;
    });
    assert.deepStrictEqual(deletedIds, [["asg-1", "asg-2", "asg-3"]]);
    assert.strictEqual(events.length, 0);
  });
});

describe("Affectation unitaire : même noyau, mêmes codes d'erreur qu'avant", () => {
  const single = (equipmentId: string) =>
    service.create({ equipmentId, assigneeType: "DEPARTMENT", assigneeId: DEPARTMENT_ID });

  test("renvoie l'affectation créée", async () => {
    const assignment = await single(EQ[0]);
    assert.strictEqual(assignment.equipmentId, EQ[0]);
    assert.strictEqual(audits.length, 1);
  });

  test("équipement indisponible ou inconnu : codes historiques EQUIPMENT_NOT_AVAILABLE et EQUIPMENT_NOT_FOUND", async () => {
    equipmentStatuses[EQ[0]] = "ASSIGNED";
    await assert.rejects(single(EQ[0]), { code: "EQUIPMENT_NOT_AVAILABLE", statusCode: 409 });
    await assert.rejects(single(EQ_MISSING), { code: "EQUIPMENT_NOT_FOUND", statusCode: 404 });
  });

  test("conflit d'unicité : EQUIPMENT_ALREADY_ASSIGNED", async () => {
    createManyError = { code: "P2002" };
    await assert.rejects(single(EQ[0]), { code: "EQUIPMENT_ALREADY_ASSIGNED" });
  });
});

describe("Routes HTTP", () => {
  let base: string;
  let server: http.Server;
  const tokenFor = (role: string) => jwt.sign({ id: `user-${role}`, role, permissions: ["assignment:create"] }, process.env.JWT_SECRET!);

  before(async () => {
    const app = (await import("../src/app")).default;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/assignments`;
  });
  after(() => server.close());

  const post = async (path: string, body: unknown, token?: string) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  const payload = (equipmentIds: string[] = EQ) => ({ assigneeType: "DEPARTMENT", assigneeId: DEPARTMENT_ID, equipmentIds });

  test("POST /bulk : 201 { count, assignments } pour un EMPLOYE, auteur = identifiant du jeton", async () => {
    const res = await post("/bulk", payload(), tokenFor("EMPLOYE"));
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.count, 3);
    assert.strictEqual(res.body.data.assignments.length, 3);
    assert.strictEqual(batchCalls[0].performedBy, "user-EMPLOYE");
  });

  test("POST /bulk : 401 sans jeton, 400 pour une liste invalide, sans rien créer", async () => {
    assert.strictEqual((await post("/bulk", payload())).status, 401);
    assert.strictEqual((await post("/bulk", payload([]), tokenFor("EMPLOYE"))).status, 400);
    assert.strictEqual((await post("/bulk", payload([EQ[0], EQ[0]]), tokenFor("EMPLOYE"))).status, 400);
    assert.strictEqual(createdRecords.length, 0);
  });

  test("POST /bulk : 409 avec le détail des équipements refusés", async () => {
    equipmentStatuses[EQ[2]] = "IN_MAINTENANCE";
    const res = await post("/bulk", payload(), tokenFor("EMPLOYE"));
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.code, "BULK_ASSIGNMENT_REFUSED");
    assert.deepStrictEqual(res.body.details.map((d: any) => [d.equipmentId, d.reason]), [[EQ[2], "NOT_AVAILABLE"]]);
    assert.strictEqual(createdRecords.length, 0);
  });

  test("POST / (unitaire) garde son contrat : 201 et l'affectation directement dans data", async () => {
    const res = await post("/", { equipmentId: EQ[0], assigneeType: "DEPARTMENT", assigneeId: DEPARTMENT_ID }, tokenFor("EMPLOYE"));
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.equipmentId, EQ[0]);
    assert.strictEqual(res.body.data.assigneeType, "DEPARTMENT");
  });
});
