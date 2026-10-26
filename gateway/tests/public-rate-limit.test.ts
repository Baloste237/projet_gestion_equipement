import assert from "node:assert";
import { AddressInfo } from "node:net";
import { test, before, after } from "node:test";
import type { Server } from "node:http";

let server: Server;
let base: string;

before(async () => {
  process.env.JWT_SECRET = "secret-de-test";
  // Services amont volontairement injoignables : les tests ne dépendent pas de ce qui tourne sur la machine
  process.env.EQUIPMENT_SERVICE_URL = "http://127.0.0.1:1";
  process.env.ASSIGNMENT_SERVICE_URL = "http://127.0.0.1:1";
  // Plafond bas, fixé avant le chargement de l'application
  process.env.PUBLIC_RATE_LIMIT_MAX = "5";
  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

test("une salve de requêtes sur /public finit par recevoir l'erreur de limitation", async () => {
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) {
    statuses.push((await fetch(`${base}/public/equipments/e1111111-1111-4111-8111-111111111111`)).status);
  }
  assert.deepStrictEqual(statuses.slice(0, 5), [503, 503, 503, 503, 503]);
  assert.deepStrictEqual(statuses.slice(5), [429, 429, 429]);
});

test("la limitation de la fiche publique ne touche pas les autres routes", async () => {
  // Le compteur public est épuisé : une route protégée répond toujours normalement (401, pas 429)
  assert.strictEqual((await fetch(`${base}/equipments`)).status, 401);
});
