import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";

process.env.JWT_SECRET = "secret-de-test";
process.env.AUDIT_SERVICE_URL = "http://127.0.0.1:1";

const SECRET = "secret-interne-de-test";

let server: http.Server;
let base: string;
let purgeCalls = 0;

before(async () => {
  const { assignmentRepository } = await import("../src/Repositories/assignment.repository");
  assignmentRepository.purgeAll = async () => {
    purgeCalls++;
    return { count: 5 };
  };

  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/assignments/internal/purge`;
});

after(() => server.close());

beforeEach(() => {
  process.env.INTERNAL_SERVICE_TOKEN = SECRET;
  purgeCalls = 0;
});

const callPurge = (token?: string) =>
  fetch(base, {
    method: "POST",
    headers: token ? { "x-internal-token": token } : {},
  });

describe("POST /api/assignments/internal/purge", () => {
  test("succès avec x-internal-token valide : purge et 200", async () => {
    const response = await callPurge(SECRET);
    assert.strictEqual(response.status, 200);
    const body = (await response.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.count, 5);
    assert.strictEqual(purgeCalls, 1);
  });

  test("refuse sans x-internal-token : 403 et aucune purge", async () => {
    const response = await callPurge();
    assert.strictEqual(response.status, 403);
    assert.strictEqual(purgeCalls, 0);
  });

  test("refuse avec un faux x-internal-token : 403 et aucune purge", async () => {
    const response = await callPurge("mauvais-secret");
    assert.strictEqual(response.status, 403);
    assert.strictEqual(purgeCalls, 0);
  });
});
