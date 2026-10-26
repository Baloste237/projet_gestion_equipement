import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";

// Faux equipment-service programmable : chaque appel à status/batch consomme la réponse suivante
let batchResponses: { status: number; body?: unknown }[];
let batchRequests: { headers: http.IncomingHttpHeaders; body: any }[];
const equipmentServer = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : {};
    const reply = (status: number, payload: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    if (req.url === "/api/equipments/lookup") {
      return reply(200, { success: true, data: body.ids.filter((id: string) => id !== "absent").map((id: string) => ({ id, name: "n", serialNumber: "s", status: "AVAILABLE" })) });
    }
    if (req.url === "/api/equipments/status/batch") {
      batchRequests.push({ headers: req.headers, body });
      const next = batchResponses.shift() ?? { status: 200, body: { success: true } };
      return reply(next.status, next.body ?? { success: true });
    }
    reply(404, { success: false });
  });
});

// Faux audit-service
let auditRequests: any[];
let auditStatus = 201;
const auditServer = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    if (req.method === "POST" && req.url === "/audit-logs") auditRequests.push(JSON.parse(raw));
    res.writeHead(auditStatus).end("{}");
  });
});

let equipmentClient: typeof import("../src/clients/equipment-service.client")["equipmentServiceClient"];
let auditPublisher: typeof import("../src/clients/audit-publisher.client")["auditPublisher"];

before(async () => {
  await new Promise<void>((resolve) => equipmentServer.listen(0, resolve));
  await new Promise<void>((resolve) => auditServer.listen(0, resolve));
  process.env.EQUIPMENT_SERVICE_URL = `http://127.0.0.1:${(equipmentServer.address() as AddressInfo).port}/api`;
  process.env.AUDIT_SERVICE_URL = `http://127.0.0.1:${(auditServer.address() as AddressInfo).port}`;
  equipmentClient = (await import("../src/clients/equipment-service.client")).equipmentServiceClient;
  auditPublisher = (await import("../src/clients/audit-publisher.client")).auditPublisher;
});

after(() => {
  equipmentServer.close();
  auditServer.close();
});

beforeEach(() => {
  batchResponses = [];
  batchRequests = [];
  auditRequests = [];
  auditStatus = 201;
});

describe("Client equipment-service : lecture groupée", () => {
  test("renvoie les équipements trouvés en un appel", async () => {
    const found = await equipmentClient.lookup(["a", "absent", "b"]);
    assert.deepStrictEqual(found.map((e) => e.id), ["a", "b"]);
  });
});

describe("Client equipment-service : changement de statut groupé", () => {
  test("succès : un seul appel, avec l'auteur en en-tête", async () => {
    const result = await equipmentClient.updateStatusBatch(["a", "b"], "AVAILABLE", "ASSIGNED", "user-42");
    assert.deepStrictEqual(result, { ok: true });
    assert.strictEqual(batchRequests.length, 1);
    assert.deepStrictEqual(batchRequests[0].body, { ids: ["a", "b"], from: "AVAILABLE", to: "ASSIGNED" });
    assert.strictEqual(batchRequests[0].headers["x-user-id"], "user-42");
  });

  test("panne passagère (500 puis 200) : rejouée une fois, puis succès", async () => {
    batchResponses = [{ status: 500, body: { success: false } }];
    const result = await equipmentClient.updateStatusBatch(["a"], "AVAILABLE", "ASSIGNED");
    assert.deepStrictEqual(result, { ok: true });
    assert.strictEqual(batchRequests.length, 2);
  });

  test("panne persistante : deux tentatives puis EQUIPMENT_SERVICE_UNAVAILABLE", async () => {
    batchResponses = [{ status: 500 }, { status: 503 }];
    await assert.rejects(equipmentClient.updateStatusBatch(["a"], "AVAILABLE", "ASSIGNED"), {
      code: "EQUIPMENT_SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
    assert.strictEqual(batchRequests.length, 2);
  });

  test("refus 409 : renvoyé avec les équipements en défaut, sans nouvelle tentative", async () => {
    batchResponses = [{ status: 409, body: { success: false, details: [{ id: "b", reason: "STATUS_MISMATCH", status: "ASSIGNED" }] } }];
    const result = await equipmentClient.updateStatusBatch(["a", "b"], "AVAILABLE", "ASSIGNED");
    assert.deepStrictEqual(result, { ok: false, conflicts: [{ id: "b", reason: "STATUS_MISMATCH", status: "ASSIGNED" }] });
    assert.strictEqual(batchRequests.length, 1);
  });
});

describe("Client d'audit", () => {
  const event = { action: "ASSIGNMENTS_CREATED", entityType: "AssignmentBatch", entityId: "b1", performedBy: "user-42", metadata: { count: 2 } };

  test("envoie l'entrée à audit-service avec le nom du service", async () => {
    await auditPublisher.publish(event);
    assert.strictEqual(auditRequests.length, 1);
    assert.deepStrictEqual(
      [auditRequests[0].action, auditRequests[0].performedBy, auditRequests[0].serviceName, auditRequests[0].metadata.count],
      ["ASSIGNMENTS_CREATED", "user-42", "assignment-service", 2]
    );
  });

  test("audit-service en erreur ou injoignable : aucune exception", async () => {
    auditStatus = 500;
    await assert.doesNotReject(auditPublisher.publish(event));
    const previous = process.env.AUDIT_SERVICE_URL;
    process.env.AUDIT_SERVICE_URL = "http://127.0.0.1:1";
    try {
      await assert.doesNotReject(auditPublisher.publish(event));
    } finally {
      process.env.AUDIT_SERVICE_URL = previous;
    }
  });
});
