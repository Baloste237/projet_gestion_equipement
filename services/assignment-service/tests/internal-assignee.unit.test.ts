import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";

process.env.JWT_SECRET = "secret-de-test";
process.env.AUDIT_SERVICE_URL = "http://127.0.0.1:1";

const SECRET = "secret-interne-de-test";
const EQ_USER = "e1111111-1111-4111-8111-111111111111";
const EQ_DEPT = "e2222222-2222-4222-8222-222222222222";
const EQ_FREE = "e3333333-3333-4333-8333-333333333333";

const ACTIVE: Record<string, { assigneeType: string; assigneeId: string }> = {
  [EQ_USER]: { assigneeType: "USER", assigneeId: "u-chi" },
  [EQ_DEPT]: { assigneeType: "DEPARTMENT", assigneeId: "d-it" },
};

let server: http.Server;
let base: string;
let queries: any[] = [];

before(async () => {
  const { prisma } = await import("../src/config/prisma");
  (prisma as any).assignment = {
    findFirst: async (query: any) => {
      queries.push(query);
      const active = ACTIVE[query.where.equipmentId];
      return active && query.where.status === "ACTIVE" ? { id: "a1", ...active } : null;
    },
  };
  const { userServiceClient } = await import("../src/clients/user-service.client");
  userServiceClient.getUserById = (async () => ({ id: "u-chi", firstName: "Chi George", lastName: "Mofor", isActive: true })) as any;
  userServiceClient.getDepartmentById = (async () => ({ id: "d-it", name: "Informatique", isActive: true })) as any;
  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/assignments/internal/active`;
});
after(() => server.close());
beforeEach(() => {
  process.env.INTERNAL_SERVICE_TOKEN = SECRET;
  queries = [];
});

const call = (equipmentId: string, token?: string) =>
  fetch(`${base}/${equipmentId}`, { headers: token ? { "x-internal-token": token } : {} });

describe("GET /assignments/internal/active/:equipmentId", () => {
  test("renvoie le nom de l'utilisateur pour un équipement affecté à une personne", async () => {
    const response = await call(EQ_USER, SECRET);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual((await response.json()).data, { assigneeType: "USER", assigneeName: "Chi George Mofor" });
    assert.strictEqual(queries.at(-1).where.status, "ACTIVE");
  });

  test("renvoie le nom du département pour un équipement affecté à un département", async () => {
    const body = await (await call(EQ_DEPT, SECRET)).json();
    assert.deepStrictEqual(body.data, { assigneeType: "DEPARTMENT", assigneeName: "Informatique" });
  });

  test("renvoie null pour un équipement libre", async () => {
    const response = await call(EQ_FREE, SECRET);
    assert.strictEqual(response.status, 200);
    assert.strictEqual((await response.json()).data, null);
  });

  test("refuse une requête sans secret ou avec un mauvais secret, sans lire la base", async () => {
    assert.strictEqual((await call(EQ_USER)).status, 403);
    assert.strictEqual((await call(EQ_USER, "mauvais-secret")).status, 403);
    assert.strictEqual((await call(EQ_USER, SECRET + "x")).status, 403);
    assert.strictEqual(queries.length, 0);
  });

  test("refuse tout quand aucun secret n'est configuré, même avec un en-tête vide", async () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    assert.strictEqual((await call(EQ_USER, "")).status, 403);
    assert.strictEqual((await call(EQ_USER, "undefined")).status, 403);
    assert.strictEqual(queries.length, 0);
  });
});
