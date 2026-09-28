import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";

// Faux user-service HTTP : doit être démarré avant l'import des clients (baseURL lue à l'import)
const knownResources: Record<string, object> = {
  "/api/departments/11111111-1111-4111-8111-111111111111": { id: "dep", name: "IT", isActive: true },
  "/api/positions/22222222-2222-4222-8222-222222222222": { id: "pos", name: "Dev", isActive: false },
};
const fakeUserService = http.createServer((req, res) => {
  const body = knownResources[req.url ?? ""];
  res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body ? { success: true, data: body } : { success: false }));
});

let validators: typeof import("../src/validators/assignment.validator");
let service: typeof import("../src/Services/assignment.service")["assignmentService"];
let repo: typeof import("../src/Repositories/assignment.repository")["assignmentRepository"];
let equipmentClient: typeof import("../src/clients/equipment-service.client")["equipmentServiceClient"];
let userClient: typeof import("../src/clients/user-service.client")["userServiceClient"];

const DEPARTMENT_ID = "11111111-1111-4111-8111-111111111111";
const POSITION_ID = "22222222-2222-4222-8222-222222222222";
const UNKNOWN_ID = "33333333-3333-4333-8333-333333333333";
const EQUIPMENT_ID = "44444444-4444-4444-8444-444444444444";

let created: Record<string, any>[] = [];
let statusUpdates: [string, string][] = [];

before(async () => {
  await new Promise<void>((resolve) => fakeUserService.listen(0, resolve));
  const { port } = fakeUserService.address() as AddressInfo;
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${port}/api`;

  validators = await import("../src/validators/assignment.validator");
  service = (await import("../src/Services/assignment.service")).assignmentService;
  repo = (await import("../src/Repositories/assignment.repository")).assignmentRepository;
  equipmentClient = (await import("../src/clients/equipment-service.client")).equipmentServiceClient;
  userClient = (await import("../src/clients/user-service.client")).userServiceClient;

  // Pas de base ni d'equipment-service : on remplace les dépendances par des doublures
  repo.create = (async (data: Record<string, any>) => {
    created.push(data);
    return { id: "asg-1", ...data };
  }) as any;
  equipmentClient.getEquipmentById = async () => ({ id: EQUIPMENT_ID, status: "AVAILABLE" });
  equipmentClient.updateEquipmentStatus = async (id: string, status: string) => {
    statusUpdates.push([id, status]);
  };
});

after(() => fakeUserService.close());

beforeEach(() => {
  created = [];
  statusUpdates = [];
});

describe("Validation du payload d'affectation", () => {
  test("accepte une affectation à un département", () => {
    const result = validators.createAssignmentSchema.safeParse({
      equipmentId: EQUIPMENT_ID,
      assigneeType: "DEPARTMENT",
      assigneeId: DEPARTMENT_ID,
    });
    assert.strictEqual(result.success, true);
  });

  test("rejette un type d'assigné inconnu", () => {
    const result = validators.createAssignmentSchema.safeParse({
      equipmentId: EQUIPMENT_ID,
      assigneeType: "TEAM",
      assigneeId: DEPARTMENT_ID,
    });
    assert.strictEqual(result.success, false);
  });

  test("traduit l'ancien champ userId en assigné de type USER", () => {
    const result = validators.createAssignmentSchema.parse({ equipmentId: EQUIPMENT_ID, userId: DEPARTMENT_ID });
    assert.deepStrictEqual(result, { equipmentId: EQUIPMENT_ID, assigneeType: "USER", assigneeId: DEPARTMENT_ID });
  });
});

describe("Client user-service (HTTP)", () => {
  test("retourne le département existant", async () => {
    const department = await userClient.getDepartmentById(DEPARTMENT_ID);
    assert.strictEqual(department.name, "IT");
  });

  test("traduit un 404 en DEPARTMENT_NOT_FOUND / POSITION_NOT_FOUND", async () => {
    await assert.rejects(userClient.getDepartmentById(UNKNOWN_ID), { code: "DEPARTMENT_NOT_FOUND", statusCode: 404 });
    await assert.rejects(userClient.getPositionById(UNKNOWN_ID), { code: "POSITION_NOT_FOUND", statusCode: 404 });
  });
});

describe("Affectation polymorphique", () => {
  test("affecte un équipement à un département et le passe en ASSIGNED", async () => {
    const assignment = await service.create({
      equipmentId: EQUIPMENT_ID,
      assigneeType: "DEPARTMENT",
      assigneeId: DEPARTMENT_ID,
    });
    assert.strictEqual(assignment.assigneeType, "DEPARTMENT");
    assert.strictEqual(assignment.assigneeId, DEPARTMENT_ID);
    assert.strictEqual(created[0].status, "ACTIVE");
    assert.deepStrictEqual(statusUpdates, [[EQUIPMENT_ID, "ASSIGNED"]]);
  });

  test("refuse l'affectation à un département inexistant", async () => {
    await assert.rejects(
      service.create({ equipmentId: EQUIPMENT_ID, assigneeType: "DEPARTMENT", assigneeId: UNKNOWN_ID }),
      { code: "DEPARTMENT_NOT_FOUND" }
    );
    assert.strictEqual(created.length, 0);
    assert.strictEqual(statusUpdates.length, 0);
  });

  test("refuse l'affectation à un poste inactif", async () => {
    await assert.rejects(
      service.create({ equipmentId: EQUIPMENT_ID, assigneeType: "POSITION", assigneeId: POSITION_ID }),
      { code: "POSITION_INACTIVE_CANNOT_ASSIGN" }
    );
    assert.strictEqual(created.length, 0);
  });
});

describe("Filtres de GET /assignments", () => {
  test("accepte des filtres valides et l'absence de filtre", () => {
    const filters = validators.assignmentFiltersSchema.parse({
      assigneeType: "POSITION",
      assigneeId: POSITION_ID,
      status: "ACTIVE",
    });
    assert.deepStrictEqual(filters, { assigneeType: "POSITION", assigneeId: POSITION_ID, status: "ACTIVE" });
    assert.deepStrictEqual(validators.assignmentFiltersSchema.parse({}), {});
  });

  test("rejette un type, un identifiant ou un statut invalides", () => {
    assert.strictEqual(validators.assignmentFiltersSchema.safeParse({ assigneeType: "TEAM" }).success, false);
    assert.strictEqual(validators.assignmentFiltersSchema.safeParse({ assigneeId: "pas-un-uuid" }).success, false);
    assert.strictEqual(validators.assignmentFiltersSchema.safeParse({ status: "DONE" }).success, false);
  });

  test("transmet les filtres au repository et laisse la réponse sans filtre inchangée", async () => {
    const seen: unknown[] = [];
    repo.findAll = (async (filters: unknown) => {
      seen.push(filters);
      return [];
    }) as any;

    await service.getAll({ assigneeType: "POSITION", assigneeId: POSITION_ID, status: "ACTIVE" });
    await service.getAll();

    assert.deepStrictEqual(seen[0], { assigneeType: "POSITION", assigneeId: POSITION_ID, status: "ACTIVE" });
    assert.deepStrictEqual(seen[1], {});
  });
});
