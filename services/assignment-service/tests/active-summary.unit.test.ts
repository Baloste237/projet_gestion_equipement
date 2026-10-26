import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "secret-de-test";
process.env.AUDIT_SERVICE_URL = "http://127.0.0.1:1";

const ROWS = [
  { equipmentId: "e1", assigneeType: "USER", assigneeId: "u1" },
  { equipmentId: "e2", assigneeType: "DEPARTMENT", assigneeId: "d1" },
];

let server: http.Server;
let base: string;
let queries: any[] = [];

before(async () => {
  const { prisma } = await import("../src/config/prisma");
  (prisma as any).assignment = {
    findMany: async (query: any) => {
      queries.push(query);
      return ROWS;
    },
  };
  const app = (await import("../src/app")).default;
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/assignments`;
});
after(() => server.close());

const token = (role: string) => jwt.sign({ id: "user-1", role, permissions: [] }, "secret-de-test");

describe("GET /assignments/active-summary", () => {
  test("ne lit que les affectations ACTIVE et renvoie les champs utiles à l'export", async () => {
    const response = await fetch(`${base}/active-summary`, { headers: { Authorization: `Bearer ${token("ADMIN")}` } });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual((await response.json()).data, ROWS);
    assert.deepStrictEqual(queries.at(-1).where, { status: "ACTIVE" });
    assert.deepStrictEqual(queries.at(-1).select, { equipmentId: true, assigneeType: true, assigneeId: true });
  });

  test("exige un jeton et la permission assignment:read", async () => {
    assert.strictEqual((await fetch(`${base}/active-summary`)).status, 401);
    const forbidden = await fetch(`${base}/active-summary`, { headers: { Authorization: `Bearer ${token("EMPLOYE")}` } });
    assert.strictEqual(forbidden.status, 403);
  });
});
