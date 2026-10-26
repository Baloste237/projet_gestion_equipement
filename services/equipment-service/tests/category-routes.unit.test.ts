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

const token = (role: string) => jwt.sign({ id: "u1", role, permissions: [] }, "test-secret", { expiresIn: "5m" });
const call = (method: string, path: string, role?: string, body: unknown = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${token(role)}` } : {}) },
    body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body),
  });

const id = "11111111-1111-4111-8111-111111111111";

describe("catégories : droits d'écriture", () => {
  const writes: [string, string][] = [
    ["POST", "/api/categories"],
    ["PATCH", `/api/categories/${id}`],
    ["DELETE", `/api/categories/${id}`],
  ];

  for (const [method, path] of writes) {
    for (const role of ["EMPLOYE", "RESPONSABLE", "AUDITEUR"]) {
      test(`${method} ${path} avec le rôle ${role} : 403`, async () => {
        assert.strictEqual((await call(method, path, role, { name: "Test" })).status, 403);
      });
    }

    test(`${method} ${path} sans jeton : 401`, async () => {
      assert.strictEqual((await call(method, path)).status, 401);
    });
  }

  test("un ADMIN passe le contrôle de rôle (une donnée invalide donne 400, pas 403)", async () => {
    assert.strictEqual((await call("POST", "/api/categories", "ADMIN", { name: "A" })).status, 400);
  });

  test("le secret interne n'ouvre pas l'écriture des catégories (401)", async () => {
    const res = await fetch(`${base}/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-token": "test-internal" },
      body: JSON.stringify({ name: "Test" }),
    });
    assert.strictEqual(res.status, 401);
  });
});

describe("catégories : route d'import", () => {
  const upload = (role: string | undefined, filename: string) => {
    const form = new FormData();
    form.append("file", new Blob(["NOM\nEcran\n"]), filename);
    return fetch(`${base}/api/categories/import`, {
      method: "POST",
      headers: role ? { Authorization: `Bearer ${token(role)}` } : {},
      body: form,
    });
  };

  test("sans jeton : 401", async () => {
    assert.strictEqual((await upload(undefined, "categories.csv")).status, 401);
  });

  for (const role of ["EMPLOYE", "RESPONSABLE", "AUDITEUR"]) {
    test(`avec le rôle ${role} : 403, le fichier n'est pas traité`, async () => {
      assert.strictEqual((await upload(role, "categories.csv")).status, 403);
    });
  }

  test("un ADMIN qui envoie un autre format que CSV ou .xlsx : 400", async () => {
    assert.strictEqual((await upload("ADMIN", "categories.txt")).status, 400);
  });

  test("un ADMIN sans fichier : 400", async () => {
    assert.strictEqual((await call("POST", "/api/categories/import", "ADMIN", {})).status, 400);
  });
});

describe("catégories : lecture", () => {
  test("la liste exige un jeton (401 sans jeton)", async () => {
    assert.strictEqual((await call("GET", "/api/categories")).status, 401);
  });

  test("un EMPLOYE n'est pas refusé sur la liste (ni 401, ni 403)", async () => {
    const status = (await call("GET", "/api/categories", "EMPLOYE")).status;
    assert.ok(status !== 401 && status !== 403, `statut inattendu ${status}`);
  });
});
