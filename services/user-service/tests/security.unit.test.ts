import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_AUTH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_AUTH_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const tokenFor = (id: string, role: string, secret = "test-secret", options: jwt.SignOptions = {}) =>
  jwt.sign({ id, role, permissions: [] }, secret, { expiresIn: "5m", ...options });

// Faux auth-service : accepte les modifications de compte (la logique de synchronisation est testée ailleurs)
const fakeAuth = http.createServer((req, res) => {
  res.writeHead(req.method === "GET" ? 404 : 200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ data: { id: OWNER_AUTH_ID, email: "x@exemple.fr", role: "EMPLOYE", isActive: true } }));
});

let server: http.Server;
let baseUrl: string;
let calls: string[] = [];

before(async () => {
  await new Promise<void>((resolve) => fakeAuth.listen(0, resolve));
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${(fakeAuth.address() as AddressInfo).port}`;
  const { userRepository } = await import("../src/Repositories/user.repository");
  userRepository.findById = (async (id: string) =>
    id === PROFILE_ID ? { id, authUserId: OWNER_AUTH_ID, isActive: true } : null) as any;
  userRepository.findAll = (async () => []) as any;
  userRepository.create = (async (d: any) => (calls.push("create"), { id: "new", ...d })) as any;
  userRepository.update = (async (id: string, d: any) => (calls.push(`update:${JSON.stringify(d)}`), { id, ...d })) as any;
  userRepository.delete = (async (id: string) => (calls.push("delete"), { id })) as any;

  const app = (await import("../src/app")).default;
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  fakeAuth.close();
});

const call = (method: string, path: string, headers: Record<string, string> = {}, body?: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("user-service : authentification", () => {
  test("refuse un appel sans jeton (401)", async () => {
    assert.strictEqual((await call("GET", "/api/users")).status, 401);
  });

  test("refuse un jeton signé avec un autre secret (401)", async () => {
    assert.strictEqual((await call("GET", "/api/users", bearer(tokenFor("x", "ADMIN", "autre")))).status, 401);
  });

  test("refuse un jeton expiré (401)", async () => {
    const expired = tokenFor("x", "ADMIN", "test-secret", { expiresIn: -10 });
    assert.strictEqual((await call("GET", "/api/users", bearer(expired))).status, 401);
  });

  test("ignore un en-tête x-user-role usurpé : le rôle du jeton prévaut", async () => {
    const headers = { ...bearer(tokenFor(OTHER_AUTH_ID, "EMPLOYE")), "x-user-role": "ADMIN" };
    assert.strictEqual((await call("PATCH", `/api/users/${PROFILE_ID}/role`, headers, { role: "ADMIN" })).status, 403);
  });

  test("accepte la lecture avec le secret interne", async () => {
    assert.strictEqual((await call("GET", "/api/users", { "x-internal-token": "test-internal" })).status, 200);
  });

  test("refuse un secret interne faux", async () => {
    assert.strictEqual((await call("GET", "/api/users", { "x-internal-token": "faux" })).status, 401);
  });

  test("le secret interne ne donne pas accès aux routes d'administration", async () => {
    const res = await call("DELETE", `/api/users/${PROFILE_ID}`, { "x-internal-token": "test-internal" });
    assert.strictEqual(res.status, 401);
  });
});

describe("user-service : gestion des comptes réservée aux administrateurs", () => {
  const employee = bearer(tokenFor(OTHER_AUTH_ID, "EMPLOYE"));
  const admin = bearer(tokenFor("admin-id", "ADMIN"));

  test("un EMPLOYE ne peut pas changer un rôle, y compris le sien (403)", async () => {
    calls = [];
    const own = bearer(tokenFor(OWNER_AUTH_ID, "EMPLOYE"));
    assert.strictEqual((await call("PATCH", `/api/users/${PROFILE_ID}/role`, own, { role: "ADMIN" })).status, 403);
    assert.deepStrictEqual(calls, []);
  });

  test("un EMPLOYE ne peut ni supprimer, ni désactiver, ni réactiver, ni créer", async () => {
    calls = [];
    assert.strictEqual((await call("DELETE", `/api/users/${PROFILE_ID}`, employee)).status, 403);
    assert.strictEqual((await call("PATCH", `/api/users/${PROFILE_ID}/deactivate`, employee)).status, 403);
    assert.strictEqual((await call("PATCH", `/api/users/${PROFILE_ID}/reactivate`, employee)).status, 403);
    assert.strictEqual((await call("POST", "/api/users", employee, {})).status, 403);
    assert.deepStrictEqual(calls, []);
  });

  test("un ADMIN peut supprimer un compte", async () => {
    calls = [];
    assert.strictEqual((await call("DELETE", `/api/users/${PROFILE_ID}`, admin)).status, 200);
    assert.deepStrictEqual(calls, ["delete"]);
  });

  test("un ADMIN peut changer un rôle", async () => {
    calls = [];
    const res = await call("PATCH", `/api/users/${PROFILE_ID}/role`, admin, { role: "RESPONSABLE" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(calls.length, 1);
  });

  test("un utilisateur modifie son propre profil", async () => {
    calls = [];
    const own = bearer(tokenFor(OWNER_AUTH_ID, "EMPLOYE"));
    assert.strictEqual((await call("PATCH", `/api/users/${PROFILE_ID}`, own, { firstName: "Alice" })).status, 200);
  });

  test("un non-ADMIN ne modifie pas le profil d'un autre (403)", async () => {
    assert.strictEqual((await call("PATCH", `/api/users/${PROFILE_ID}`, employee, { firstName: "Alice" })).status, 403);
  });

  test("écriture des départements et postes réservée à ADMIN, lecture ouverte", async () => {
    assert.strictEqual((await call("POST", "/api/departments", employee, { name: "X" })).status, 403);
    assert.strictEqual((await call("DELETE", `/api/positions/${PROFILE_ID}`, employee)).status, 403);
    assert.strictEqual((await call("GET", "/api/departments", { "x-internal-token": "test-internal" })).status, 200);
  });
});

describe("user-service : configuration", () => {
  test("assertSecurityConfig refuse de démarrer sans JWT_SECRET", async () => {
    const { assertSecurityConfig } = await import("../src/middlewares/security");
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    assert.throws(() => assertSecurityConfig(), /JWT_SECRET/);
    process.env.JWT_SECRET = saved;
  });

  test("assertSecurityConfig refuse de démarrer sans INTERNAL_SERVICE_TOKEN", async () => {
    const { assertSecurityConfig } = await import("../src/middlewares/security");
    const saved = process.env.INTERNAL_SERVICE_TOKEN;
    delete process.env.INTERNAL_SERVICE_TOKEN;
    assert.throws(() => assertSecurityConfig(), /INTERNAL_SERVICE_TOKEN/);
    process.env.INTERNAL_SERVICE_TOKEN = saved;
  });
});

describe("user-service : contenu des avatars vérifié", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const dir = path.join(__dirname, "..", "uploads", "avatars");
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
  const known = new Set<string>();

  before(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.readdirSync(dir).forEach((f) => known.add(f));
  });
  after(() => {
    for (const f of fs.readdirSync(dir)) if (!known.has(f)) fs.rmSync(path.join(dir, f), { force: true });
  });

  const send = (content: Buffer, name: string, type: string) => {
    const form = new FormData();
    form.append("avatar", new Blob([content], { type }), name);
    return fetch(`${baseUrl}/api/users/${PROFILE_ID}/avatar`, {
      method: "POST",
      headers: bearer(tokenFor(OWNER_AUTH_ID, "EMPLOYE")),
      body: form,
    });
  };

  test("un faux .png (texte) est rejeté (400) et supprimé", async () => {
    const res = await send(Buffer.from("pas une image"), "avatar.png", "image/png");
    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(fs.readdirSync(dir).filter((f) => !known.has(f)), []);
  });

  test("un vrai PNG est accepté", async () => {
    const res = await send(PNG, "avatar.exe", "image/png");
    assert.strictEqual(res.status, 200);
    assert.ok(fs.readdirSync(dir).filter((f) => !known.has(f)).every((f) => f.endsWith(".png")));
  });
});
