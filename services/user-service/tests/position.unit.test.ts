import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";

const DEPARTMENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";
const POSITION_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_POSITION_ID = "44444444-4444-4444-8444-444444444444";

// Faux assignment-service : renvoie des affectations actives pour ACTIVE_POSITION, une panne pour BROKEN_POSITION
const ACTIVE_POSITION = "55555555-5555-4555-8555-555555555555";
const BROKEN_POSITION = "66666666-6666-4666-8666-666666666666";
let receivedAuthorization: string | undefined;
const fakeAssignmentService = http.createServer((req, res) => {
  receivedAuthorization = req.headers.authorization;
  const url = new URL(req.url ?? "", "http://localhost");
  const id = url.searchParams.get("assigneeId");
  if (id === BROKEN_POSITION) {
    res.writeHead(500).end();
    return;
  }
  const data = id === ACTIVE_POSITION ? [{ id: "a1" }, { id: "a2" }] : [];
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: true, data }));
});

// Faux audit-service : mémorise les événements reçus
let auditEvents: Record<string, any>[] = [];
const fakeAuditService = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    if (req.method === "POST" && req.url === "/audit-logs") auditEvents.push(JSON.parse(raw));
    res.writeHead(201, { "Content-Type": "application/json" }).end("{}");
  });
});
const waitForAudit = async (count: number) => {
  for (let i = 0; i < 50 && auditEvents.length < count; i++) await new Promise((r) => setTimeout(r, 20));
};

let validators: typeof import("../src/validators/position.validator");
let service: typeof import("../src/Services/position.service")["positionService"];
let positionRepo: typeof import("../src/Repositories/position.repository")["positionRepository"];
let departmentRepo: typeof import("../src/Repositories/departmentRepository")["departmentRepository"];
let assignmentClient: typeof import("../src/clients/assignment-service.client")["assignmentServiceClient"];
let errorHandler: typeof import("../src/middlewares/error-handler")["errorHandler"];

let positions: Record<string, any>[] = [];
let created: Record<string, any>[] = [];
let updated: [string, Record<string, any>][] = [];
let deleted: string[] = [];

before(async () => {
  await new Promise<void>((resolve) => fakeAssignmentService.listen(0, resolve));
  const { port } = fakeAssignmentService.address() as AddressInfo;
  process.env.ASSIGNMENT_SERVICE_URL = `http://127.0.0.1:${port}/api`;
  await new Promise<void>((resolve) => fakeAuditService.listen(0, resolve));
  process.env.AUDIT_SERVICE_URL = `http://127.0.0.1:${(fakeAuditService.address() as AddressInfo).port}`;

  validators = await import("../src/validators/position.validator");
  service = (await import("../src/Services/position.service")).positionService;
  positionRepo = (await import("../src/Repositories/position.repository")).positionRepository;
  departmentRepo = (await import("../src/Repositories/departmentRepository")).departmentRepository;
  assignmentClient = (await import("../src/clients/assignment-service.client")).assignmentServiceClient;
  errorHandler = (await import("../src/middlewares/error-handler")).errorHandler;

  // Pas de base de données : les repositories sont remplacés par des doublures en mémoire
  departmentRepo.findById = (async (id: string) =>
    id === DEPARTMENT_ID || id === OTHER_DEPARTMENT_ID ? { id, name: "Dept" } : null) as any;
  positionRepo.findById = (async (id: string) => positions.find((p) => p.id === id) ?? null) as any;
  positionRepo.findByNameInDepartment = (async (name: string, departmentId: string) =>
    positions.find((p) => p.departmentId === departmentId && p.name.toLowerCase() === name.toLowerCase()) ??
    null) as any;
  positionRepo.create = (async (data: Record<string, any>) => {
    created.push(data);
    return { id: "new", ...data };
  }) as any;
  positionRepo.update = (async (id: string, data: Record<string, any>) => {
    updated.push([id, data]);
    return { id, ...data };
  }) as any;
  positionRepo.delete = (async (id: string) => {
    deleted.push(id);
    return { id };
  }) as any;
});

after(() => {
  fakeAssignmentService.close();
  fakeAuditService.close();
});

beforeEach(() => {
  positions = [
    { id: POSITION_ID, name: "Technicien réseau", departmentId: DEPARTMENT_ID },
    { id: ACTIVE_POSITION, name: "Développeur", departmentId: DEPARTMENT_ID },
    { id: BROKEN_POSITION, name: "Comptable", departmentId: DEPARTMENT_ID },
  ];
  created = [];
  updated = [];
  deleted = [];
  receivedAuthorization = undefined;
  auditEvents = [];
});

const statusOf = (err: unknown) => {
  let captured: { status?: number; body?: any } = {};
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  };
  errorHandler(err, {} as any, res as any, (() => {}) as any);
  return captured;
};

describe("Validation des postes", () => {
  test("accepte un poste valide et applique les valeurs facultatives", () => {
    const result = validators.createPositionSchema.safeParse({ name: "Technicien", departmentId: DEPARTMENT_ID });
    assert.strictEqual(result.success, true);
  });

  test("rejette un nom trop court, un département invalide et un statut inconnu", () => {
    assert.strictEqual(validators.createPositionSchema.safeParse({ name: "A", departmentId: DEPARTMENT_ID }).success, false);
    assert.strictEqual(validators.createPositionSchema.safeParse({ name: " A ", departmentId: DEPARTMENT_ID }).success, false);
    assert.strictEqual(validators.createPositionSchema.safeParse({ name: "Technicien", departmentId: "x" }).success, false);
    assert.strictEqual(
      validators.createPositionSchema.safeParse({ name: "Technicien", departmentId: DEPARTMENT_ID, status: "PAUSE" }).success,
      false
    );
    assert.strictEqual(validators.createPositionSchema.safeParse({ departmentId: DEPARTMENT_ID }).success, false);
  });

  test("la mise à jour accepte un sous-ensemble de champs mais pas de valeurs invalides", () => {
    assert.strictEqual(validators.updatePositionSchema.safeParse({ status: "INACTIF" }).success, true);
    assert.strictEqual(validators.updatePositionSchema.safeParse({}).success, true);
    assert.strictEqual(validators.updatePositionSchema.safeParse({ name: "" }).success, false);
  });
});

describe("Création d'un poste", () => {
  test("crée un poste actif, nom nettoyé, état cohérent", async () => {
    const position = await service.create({ name: "  Chef de projet ", departmentId: DEPARTMENT_ID });
    assert.strictEqual(position.name, "Chef de projet");
    assert.strictEqual(created.length, 1);
  });

  test("renseigne isActive à partir du statut", async () => {
    await service.create({ name: "Stagiaire", departmentId: DEPARTMENT_ID, status: "INACTIF" });
    assert.strictEqual(created[0].isActive, false);
    assert.strictEqual(created[0].status, "INACTIF");
  });

  test("refuse un nom en doublon dans le département, sans tenir compte de la casse", async () => {
    await assert.rejects(service.create({ name: "TECHNICIEN RÉSEAU", departmentId: DEPARTMENT_ID }), {
      code: "POSITION_NAME_CONFLICT",
      statusCode: 409,
    });
    assert.strictEqual(created.length, 0);
  });

  test("autorise le même nom dans un autre département", async () => {
    await service.create({ name: "Technicien réseau", departmentId: OTHER_DEPARTMENT_ID });
    assert.strictEqual(created.length, 1);
  });

  test("refuse un département inexistant", async () => {
    await assert.rejects(
      service.create({ name: "Analyste", departmentId: "77777777-7777-4777-8777-777777777777" }),
      { code: "DEPARTMENT_NOT_FOUND", statusCode: 400 }
    );
    assert.strictEqual(created.length, 0);
  });
});

describe("Modification d'un poste", () => {
  test("désactive un poste via son statut", async () => {
    await service.update(POSITION_ID, { status: "INACTIF" });
    assert.deepStrictEqual(updated[0], [POSITION_ID, { status: "INACTIF", isActive: false }]);
  });

  test("permet de garder son propre nom, mais pas celui d'un autre poste du département", async () => {
    await service.update(POSITION_ID, { name: "Technicien réseau", description: "MAJ" });
    assert.strictEqual(updated.length, 1);
    await assert.rejects(service.update(POSITION_ID, { name: "développeur" }), { code: "POSITION_NAME_CONFLICT" });
    assert.strictEqual(updated.length, 1);
  });

  test("vérifie l'unicité dans le département de destination lors d'un déplacement", async () => {
    positions.push({ id: OTHER_POSITION_ID, name: "Technicien réseau", departmentId: OTHER_DEPARTMENT_ID });
    await assert.rejects(service.update(POSITION_ID, { departmentId: OTHER_DEPARTMENT_ID }), {
      code: "POSITION_NAME_CONFLICT",
    });
  });

  test("signale un poste inconnu comme introuvable (404)", async () => {
    await assert.rejects(service.update("88888888-8888-4888-8888-888888888888", { name: "Autre" }), {
      message: "POSITION_NOT_FOUND",
    });
  });
});

describe("Suppression d'un poste", () => {
  test("supprime un poste sans affectation active et relaie le jeton", async () => {
    await service.delete(POSITION_ID, "Bearer jeton-employe");
    assert.deepStrictEqual(deleted, [POSITION_ID]);
    assert.strictEqual(receivedAuthorization, "Bearer jeton-employe");
  });

  test("refuse la suppression quand une affectation est active", async () => {
    await assert.rejects(service.delete(ACTIVE_POSITION, "Bearer jeton"), {
      code: "POSITION_HAS_ACTIVE_ASSIGNMENTS",
      statusCode: 409,
    });
    assert.strictEqual(deleted.length, 0);
  });

  test("refuse la suppression si le service d'affectation répond en erreur (échec fermé)", async () => {
    await assert.rejects(service.delete(BROKEN_POSITION, "Bearer jeton"), {
      code: "ASSIGNMENT_SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
    assert.strictEqual(deleted.length, 0);
  });

  test("refuse la suppression si le service d'affectation est injoignable", async () => {
    const previous = process.env.ASSIGNMENT_SERVICE_URL;
    process.env.ASSIGNMENT_SERVICE_URL = "http://127.0.0.1:1/api";
    try {
      await assert.rejects(assignmentClient.countActiveForPosition(POSITION_ID), {
        code: "ASSIGNMENT_SERVICE_UNAVAILABLE",
      });
    } finally {
      process.env.ASSIGNMENT_SERVICE_URL = previous;
    }
  });
});

describe("Codes HTTP des erreurs", () => {
  test("mappe les erreurs métier sur leur statut et les *_NOT_FOUND sur 404", async () => {
    const conflict = await service.create({ name: "Développeur", departmentId: DEPARTMENT_ID }).catch((e) => e);
    assert.deepStrictEqual(statusOf(conflict), {
      status: 409,
      body: { success: false, code: "POSITION_NAME_CONFLICT", message: conflict.message },
    });
    assert.strictEqual(statusOf(new Error("POSITION_NOT_FOUND")).status, 404);
  });
});

describe("Routes HTTP /api/positions", () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = (await import("../src/app")).default;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/positions`;
  });

  after(() => server.close());

  const call = async (method: string, path: string, body?: unknown, token?: string) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as any };
  };

  test("POST crée un poste sans contrôle de rôle (201) et rejette un corps invalide (400)", async () => {
    const ok = await call("POST", "", { name: "Auditeur", departmentId: DEPARTMENT_ID });
    assert.strictEqual(ok.status, 201);
    assert.strictEqual(ok.body.data.name, "Auditeur");

    const invalid = await call("POST", "", { name: "A", departmentId: DEPARTMENT_ID });
    assert.strictEqual(invalid.status, 400);
  });

  test("POST renvoie 409 en cas de doublon et 400 pour un département inconnu", async () => {
    const conflict = await call("POST", "", { name: "Développeur", departmentId: DEPARTMENT_ID });
    assert.strictEqual(conflict.status, 409);
    assert.strictEqual(conflict.body.code, "POSITION_NAME_CONFLICT");

    const unknown = await call("POST", "", { name: "Autre", departmentId: "99999999-9999-4999-8999-999999999999" });
    assert.strictEqual(unknown.status, 400);
    assert.strictEqual(unknown.body.code, "DEPARTMENT_NOT_FOUND");
  });

  test("PATCH modifie (200) et renvoie 404 pour un poste inconnu", async () => {
    const ok = await call("PATCH", `/${POSITION_ID}`, { status: "INACTIF" });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.body.data.isActive, false);

    const missing = await call("PATCH", "/88888888-8888-4888-8888-888888888888", { name: "Autre" });
    assert.strictEqual(missing.status, 404);
  });

  test("DELETE relaie le jeton, refuse avec 409 s'il y a des affectations actives, 200 sinon", async () => {
    const blocked = await call("DELETE", `/${ACTIVE_POSITION}`, undefined, "jeton-employe");
    assert.strictEqual(blocked.status, 409);
    assert.strictEqual(blocked.body.code, "POSITION_HAS_ACTIVE_ASSIGNMENTS");
    assert.strictEqual(receivedAuthorization, "Bearer jeton-employe");

    const ok = await call("DELETE", `/${POSITION_ID}`, undefined, "jeton-employe");
    assert.strictEqual(ok.status, 200);
    assert.deepStrictEqual(deleted, [POSITION_ID]);
  });
});

describe("Audit des opérations sur les postes", () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = (await import("../src/app")).default;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/positions`;
  });

  after(() => server.close());

  const send = (method: string, path: string, body?: unknown) =>
    fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-user-id": "user-42" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  test("enregistre la création, la modification et la suppression avec l'auteur", async () => {
    await send("POST", "", { name: "Auditeur interne", departmentId: DEPARTMENT_ID });
    await send("PATCH", `/${POSITION_ID}`, { description: "Nouvelle description" });
    await send("DELETE", `/${POSITION_ID}`);
    await waitForAudit(3);

    assert.deepStrictEqual(
      auditEvents.map((e) => [e.action, e.entityType, e.performedBy, e.serviceName]),
      [
        ["POSITION_CREATED", "Position", "user-42", "user-service"],
        ["POSITION_UPDATED", "Position", "user-42", "user-service"],
        ["POSITION_DELETED", "Position", "user-42", "user-service"],
      ]
    );
    assert.strictEqual(auditEvents[1].entityId, POSITION_ID);
  });

  test("n'enregistre rien quand l'opération est refusée", async () => {
    const response = await send("POST", "", { name: "Développeur", departmentId: DEPARTMENT_ID });
    assert.strictEqual(response.status, 409);
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(auditEvents.length, 0);
  });

  test("une panne d'audit-service ne fait pas échouer l'opération", async () => {
    const previous = process.env.AUDIT_SERVICE_URL;
    process.env.AUDIT_SERVICE_URL = "http://127.0.0.1:1";
    try {
      const response = await send("POST", "", { name: "Chargé de mission", departmentId: DEPARTMENT_ID });
      assert.strictEqual(response.status, 201);
    } finally {
      process.env.AUDIT_SERVICE_URL = previous;
    }
  });
});
