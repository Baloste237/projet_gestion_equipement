import assert from "node:assert";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import type { Server } from "node:http";

let server: Server;
let base: string;

before(async () => {
  process.env.JWT_SECRET = "secret-de-test";
  // Services amont volontairement injoignables : les tests ne dépendent pas de ce qui tourne sur la machine
  process.env.EQUIPMENT_SERVICE_URL = "http://127.0.0.1:1";
  process.env.ASSIGNMENT_SERVICE_URL = "http://127.0.0.1:1";
  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

describe("Routes internes derrière la passerelle", () => {
  test("/assignments/internal/... renvoie 401 sans jeton, même avec le secret interne", async () => {
    const id = "e1111111-1111-4111-8111-111111111111";
    const withoutAnything = await fetch(`${base}/assignments/internal/active/${id}`);
    assert.strictEqual(withoutAnything.status, 401);
    const withInternalSecret = await fetch(`${base}/assignments/internal/active/${id}`, {
      headers: { "x-internal-token": "n'importe quoi" },
    });
    assert.strictEqual(withInternalSecret.status, 401);
  });

  test("les autres routes d'affectation restent protégées", async () => {
    assert.strictEqual((await fetch(`${base}/assignments/active-summary`)).status, 401);
  });
});

describe("Fiche publique d'équipement", () => {
  test("/public n'exige aucun jeton : la passerelle transmet la requête au service équipement", async () => {
    // Aucun service équipement ne tourne dans ce test : 503 (service injoignable) prouve que la requête est passée
    const response = await fetch(`${base}/public/equipments/e1111111-1111-4111-8111-111111111111`);
    assert.notStrictEqual(response.status, 401);
    assert.strictEqual(response.status, 503);
  });

  test("les routes d'équipements restent protégées", async () => {
    assert.strictEqual((await fetch(`${base}/equipments`)).status, 401);
  });
});
