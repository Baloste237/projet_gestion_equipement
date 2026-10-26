import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

let server: http.Server;
let base: string;
let stored: Record<string, any>[] = [];

before(async () => {
  const { auditLogService } = await import("../src/services/audit-log.service");
  auditLogService.create = (async (data: Record<string, any>) => {
    stored.push(data);
    return { id: "log-1", ...data };
  }) as any;
  auditLogService.getAll = (async () => []) as any;

  const app = (await import("../src/app")).default;
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/audit-logs`;
});

after(() => server.close());
beforeEach(() => {
  stored = [];
  process.env.INTERNAL_SERVICE_TOKEN = "test-internal";
});

const event = { action: "TEST", entityType: "X", entityId: "1", performedBy: "u1", serviceName: "test" };
const post = (headers: Record<string, string> = {}) =>
  fetch(base, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(event) });

describe("audit-service : écriture réservée aux services", () => {
  test("POST sans secret interne : 403 et rien d'enregistré", async () => {
    assert.strictEqual((await post()).status, 403);
    assert.strictEqual(stored.length, 0);
  });

  test("POST avec un faux secret : 403", async () => {
    assert.strictEqual((await post({ "x-internal-token": "faux" })).status, 403);
    assert.strictEqual(stored.length, 0);
  });

  test("un jeton utilisateur ADMIN ne permet pas d'écrire dans le journal : 403", async () => {
    const admin = jwt.sign({ id: "a", role: "ADMIN", permissions: [] }, "test-secret", { expiresIn: "5m" });
    assert.strictEqual((await post({ Authorization: `Bearer ${admin}` })).status, 403);
    assert.strictEqual(stored.length, 0);
  });

  test("POST avec le secret interne valide : 201 et entrée enregistrée", async () => {
    assert.strictEqual((await post({ "x-internal-token": "test-internal" })).status, 201);
    assert.strictEqual(stored.length, 1);
  });

  test("sans secret configuré sur le service, toute écriture est refusée", async () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    assert.strictEqual((await post({ "x-internal-token": "" })).status, 403);
    assert.strictEqual((await post({ "x-internal-token": "test-internal" })).status, 403);
    assert.strictEqual(stored.length, 0);
  });
});

describe("audit-service : lecture authentifiée", () => {
  test("GET sans jeton : 401", async () => {
    assert.strictEqual((await fetch(base)).status, 401);
  });

  test("un jeton signé avec un autre secret est refusé (401)", async () => {
    const forged = jwt.sign({ id: "a", role: "ADMIN", permissions: [] }, "votre_secret_partage_entre_services");
    assert.strictEqual((await fetch(base, { headers: { Authorization: `Bearer ${forged}` } })).status, 401);
  });

  test("un ADMIN avec un vrai jeton peut lire", async () => {
    const admin = jwt.sign({ id: "a", role: "ADMIN", permissions: [] }, "test-secret", { expiresIn: "5m" });
    assert.strictEqual((await fetch(base, { headers: { Authorization: `Bearer ${admin}` } })).status, 200);
  });
});

describe("audit-service : erreurs serveur", () => {
  test("une exception inattendue renvoie un message générique", async () => {
    const { errorHandler } = await import("../src/middlewares/error-handler");
    const captured: { status?: number; body?: any } = {};
    const res: any = { status(c: number) { captured.status = c; return this; }, json(b: unknown) { captured.body = b; return this; } };
    const original = console.error;
    console.error = () => {};
    try {
      errorHandler(new Error("connexion à postgres://user:secret@db échouée"), {} as any, res, () => {});
    } finally {
      console.error = original;
    }
    assert.strictEqual(captured.status, 500);
    assert.ok(!JSON.stringify(captured.body).includes("postgres"));
  });
});
