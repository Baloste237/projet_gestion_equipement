import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

const ID = "11111111-1111-4111-8111-111111111111";
const internal = { "x-internal-token": "test-internal" };

let server: http.Server;
let base: string;
let origin: string;
let patches: [string, Record<string, unknown>][] = [];

before(async () => {
  const { credentialRepository } = await import("../src/repositories/credential.repository");
  credentialRepository.findByEmail = (async (email: string) =>
    email.toLowerCase() === "alice@exemple.fr"
      ? { id: ID, email: "alice@exemple.fr", role: "EMPLOYE", isActive: true, passwordHash: "NE-DOIT-PAS-FUITER" }
      : null) as any;
  const { credentialAdminService } = await import("../src/services/credential-admin.service");
  credentialAdminService.update = (async (id: string, patch: Record<string, unknown>) => {
    patches.push([id, patch]);
    return { id, email: "alice@exemple.fr", role: "RESPONSABLE", isActive: true };
  }) as any;

  const app = (await import("../src/app")).default;
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  base = `${origin}/internal/credentials`;
});
after(() => server.close());

const patch = (path: string, body: unknown, headers: Record<string, string> = internal) =>
  fetch(`${base}${path}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("auth-service : routes internes sur les comptes", () => {
  test("GET par e-mail avec le secret : 200, casse ignorée, jamais de hash", async () => {
    const res = await fetch(`${base}/by-email/Alice%40Exemple.fr`, { headers: internal });
    assert.strictEqual(res.status, 200);
    const { data } = (await res.json()) as any;
    assert.deepStrictEqual(Object.keys(data).sort(), ["email", "id", "isActive", "role"]);
    assert.ok(!JSON.stringify(data).includes("FUITER"));
  });

  test("GET d'un e-mail inconnu : 404", async () => {
    assert.strictEqual((await fetch(`${base}/by-email/inconnu%40exemple.fr`, { headers: internal })).status, 404);
  });

  test("sans secret ou avec un faux secret : 403 et aucune lecture ni modification", async () => {
    patches = [];
    assert.strictEqual((await fetch(`${base}/by-email/alice%40exemple.fr`)).status, 403);
    assert.strictEqual((await fetch(`${base}/by-email/alice%40exemple.fr`, { headers: { "x-internal-token": "faux" } })).status, 403);
    assert.strictEqual((await patch(`/${ID}`, { role: "ADMIN" }, {})).status, 403);
    assert.strictEqual((await patch(`/${ID}`, { role: "ADMIN" }, { "x-internal-token": "faux" })).status, 403);
    assert.deepStrictEqual(patches, []);
  });

  test("PATCH valide : transmis au service ; corps ou identifiant invalide : 400", async () => {
    patches = [];
    assert.strictEqual((await patch(`/${ID}`, { role: "RESPONSABLE" })).status, 200);
    assert.deepStrictEqual(patches, [[ID, { role: "RESPONSABLE" }]]);
    assert.strictEqual((await patch(`/${ID}`, {})).status, 400);
    assert.strictEqual((await patch(`/${ID}`, { role: "ROI" })).status, 400);
    assert.strictEqual((await patch("/pas-un-uuid", { role: "ADMIN" })).status, 400);
    assert.strictEqual(patches.length, 1);
  });

  test("le chemin public /auth ne donne pas accès aux routes internes", async () => {
    const res = await fetch(`${origin}/auth/internal/credentials/by-email/alice%40exemple.fr`, { headers: internal });
    assert.strictEqual(res.status, 404);
  });
});
