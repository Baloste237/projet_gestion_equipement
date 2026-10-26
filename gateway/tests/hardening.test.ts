import assert from "node:assert";
import { AddressInfo } from "node:net";
import { test, before, after } from "node:test";
import type { Server } from "node:http";

let server: Server;
let base: string;

before(async () => {
  process.env.JWT_SECRET = "secret-de-test";
  process.env.AUTH_SERVICE_URL = "http://127.0.0.1:1";
  process.env.CORS_ORIGIN = "https://demo.exemple.app";
  // Un proxy de confiance devant le gateway : l'IP client vient de X-Forwarded-For
  process.env.TRUST_PROXY_HOPS = "1";
  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const login = (ip: string) => fetch(`${base}/auth/login`, { method: "POST", headers: { "X-Forwarded-For": ip } });

test("le limiteur du login compte chaque client réel séparément derrière le proxy", async () => {
  for (let i = 0; i < 10; i++) await login("203.0.113.10");
  assert.strictEqual((await login("203.0.113.10")).status, 429);
  assert.notStrictEqual((await login("203.0.113.99")).status, 429);
});

test("CORS : l'origine déclarée est autorisée, une autre ne l'est pas", async () => {
  const allowed = await fetch(`${base}/health`, { headers: { Origin: "https://demo.exemple.app" } });
  assert.strictEqual(allowed.headers.get("access-control-allow-origin"), "https://demo.exemple.app");

  const denied = await fetch(`${base}/health`, { headers: { Origin: "https://pirate.exemple.com" } });
  assert.notStrictEqual(denied.headers.get("access-control-allow-origin"), "https://pirate.exemple.com");
  assert.notStrictEqual(denied.headers.get("access-control-allow-origin"), "*");
});

test("une route privée sans jeton est refusée (401)", async () => {
  assert.strictEqual((await fetch(`${base}/equipments`)).status, 401);
});

test("les routes internes de comptes ne sont pas exposées par le gateway (404)", async () => {
  const headers = { "x-internal-token": "nimporte-quoi" };
  assert.strictEqual((await fetch(`${base}/internal/credentials/by-email/alice%40exemple.fr`, { headers })).status, 404);
  assert.strictEqual((await fetch(`${base}/auth/internal/credentials/by-email/alice%40exemple.fr`, { headers })).status !== 200, true);
});
