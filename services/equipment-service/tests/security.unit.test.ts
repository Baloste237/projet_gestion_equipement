import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

let server: http.Server;
let base: string;

before(async () => {
  const app = (await import("../src/app")).default;
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

const sign = (secret = "test-secret", options: jwt.SignOptions = {}) =>
  jwt.sign({ id: "u1", role: "EMPLOYE", permissions: [] }, secret, { expiresIn: "5m", ...options });

describe("equipment-service : authentification", () => {
  const privateRoutes: [string, string][] = [
    ["GET", "/api/equipments"],
    ["DELETE", "/api/equipments/11111111-1111-4111-8111-111111111111"],
    ["POST", "/api/equipments/import"],
    ["GET", "/api/equipments/export"],
    ["POST", "/api/equipments/status/batch"],
    ["GET", "/api/categories"],
    ["DELETE", "/api/categories/11111111-1111-4111-8111-111111111111"],
    ["GET", "/api/suppliers"],
    ["DELETE", "/api/suppliers/11111111-1111-4111-8111-111111111111"],
  ];

  for (const [method, path] of privateRoutes) {
    test(`${method} ${path} sans jeton : 401`, async () => {
      assert.strictEqual((await fetch(`${base}${path}`, { method })).status, 401);
    });
  }

  test("un jeton signé avec un autre secret est refusé (401)", async () => {
    const res = await fetch(`${base}/api/equipments`, { headers: { Authorization: `Bearer ${sign("autre")}` } });
    assert.strictEqual(res.status, 401);
  });

  test("un jeton expiré est refusé (401)", async () => {
    const res = await fetch(`${base}/api/equipments`, { headers: { Authorization: `Bearer ${sign("test-secret", { expiresIn: -10 })}` } });
    assert.strictEqual(res.status, 401);
  });

  test("des en-têtes x-user-* sans jeton ne donnent pas accès (401)", async () => {
    const res = await fetch(`${base}/api/equipments`, { headers: { "x-user-id": "u1", "x-user-role": "ADMIN" } });
    assert.strictEqual(res.status, 401);
  });

  test("la fiche publique reste accessible sans jeton (pas de 401)", async () => {
    const res = await fetch(`${base}/api/public/equipments/pas-un-uuid`);
    assert.notStrictEqual(res.status, 401);
  });
});

describe("equipment-service : secret interne (service à service)", () => {
  const internal = { "x-internal-token": "test-internal", "Content-Type": "application/json" };
  const id = "11111111-1111-4111-8111-111111111111";

  test("lecture d'un équipement et recherche par identifiants : acceptées avec le secret", async () => {
    assert.notStrictEqual((await fetch(`${base}/api/equipments/${id}`, { headers: internal })).status, 401);
    assert.notStrictEqual((await fetch(`${base}/api/equipments/lookup`, { method: "POST", headers: internal, body: "{}" })).status, 401);
    assert.notStrictEqual((await fetch(`${base}/api/equipments/status/batch`, { method: "POST", headers: internal, body: "{}" })).status, 401);
  });

  test("PATCH /:id n'est ouvert au secret que pour { status } seul", async () => {
    const patch = (body: object) => fetch(`${base}/api/equipments/${id}`, { method: "PATCH", headers: internal, body: JSON.stringify(body) });
    assert.notStrictEqual((await patch({ status: "AVAILABLE" })).status, 401);
    assert.strictEqual((await patch({ status: "AVAILABLE", name: "autre" })).status, 401);
    assert.strictEqual((await patch({ name: "autre" })).status, 401);
    assert.strictEqual((await patch({})).status, 401);
  });

  test("le secret n'ouvre ni la suppression, ni la création, ni l'export, ni l'import", async () => {
    const denied: [string, string][] = [
      ["DELETE", `/api/equipments/${id}`],
      ["POST", "/api/equipments"],
      ["GET", "/api/equipments/export"],
      ["POST", "/api/equipments/import"],
      ["POST", `/api/equipments/${id}/transfer`],
      ["GET", "/api/categories"],
      ["GET", "/api/suppliers"],
    ];
    for (const [method, path] of denied) {
      const res = await fetch(`${base}${path}`, { method, headers: internal, body: method === "GET" || method === "DELETE" ? undefined : "{}" });
      assert.strictEqual(res.status, 401, `${method} ${path}`);
    }
  });

  test("un mauvais secret est refusé (401)", async () => {
    const res = await fetch(`${base}/api/equipments/${id}`, { headers: { "x-internal-token": "faux" } });
    assert.strictEqual(res.status, 401);
  });
});

describe("equipment-service : configuration", () => {
  test("assertSecurityConfig refuse de démarrer sans JWT_SECRET", async () => {
    const { assertSecurityConfig } = await import("../src/middlewares/security");
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    assert.throws(() => assertSecurityConfig(), /JWT_SECRET/);
    process.env.JWT_SECRET = saved;
  });
});

describe("equipment-service : erreurs serveur", () => {
  test("une exception inattendue renvoie un message générique sans trace", async () => {
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
    assert.ok(!JSON.stringify(captured.body).includes("secret"));
  });
});

describe("equipment-service : appels vers user-service", () => {
  test("la lecture des utilisateurs, départements et postes porte le secret interne", async () => {
    const seen: (string | undefined)[] = [];
    const fake = http.createServer((req, res) => {
      seen.push(req.headers["x-internal-token"] as string | undefined);
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: [] }));
    });
    await new Promise<void>((resolve) => fake.listen(0, resolve));
    const previous = process.env.USER_SERVICE_URL;
    process.env.USER_SERVICE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/api`;
    try {
      const { userServiceClient } = await import("../src/clients/user-service.client");
      await userServiceClient.listUsers();
      await userServiceClient.listDepartments();
      await userServiceClient.listPositions();
      assert.deepStrictEqual(seen, ["test-internal", "test-internal", "test-internal"]);
    } finally {
      process.env.USER_SERVICE_URL = previous;
      fake.close();
    }
  });
});
