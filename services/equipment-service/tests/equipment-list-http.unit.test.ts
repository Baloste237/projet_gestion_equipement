import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

const auth = { Authorization: `Bearer ${jwt.sign({ id: "u1", role: "EMPLOYE", permissions: [] }, "test-secret", { expiresIn: "5m" })}` };

describe("GET /api/equipments : pagination, tri et filtres", () => {
  let server: http.Server;
  let base: string;
  let calls: { find: any[]; count: any[] };
  let total = 620;

  before(async () => {
    const { prisma } = await import("../src/config/prisma");
    (prisma as any).equipment = {
      findMany: (args: any) => {
        calls.find.push(args);
        const size = args.take ?? total;
        const start = args.skip ?? 0;
        const rows = Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) => ({ id: `eq-${start + i}` }));
        return Promise.resolve(rows);
      },
      count: (args: any) => (calls.count.push(args), Promise.resolve(total)),
    };
    (prisma as any).$transaction = (operations: Promise<unknown>[]) => Promise.all(operations);
    const app = (await import("../src/app")).default;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/equipments`;
  });
  after(() => server.close());

  const get = async (query = "", headers: Record<string, string> = auth) => {
    calls = { find: [], count: [] };
    const res = await fetch(`${base}${query}`, { headers });
    return { status: res.status, body: (await res.json()) as any };
  };

  test("sans paramètre : liste complète, `data` seul, tri par date d'ajout décroissante, sans skip ni take", async () => {
    const { status, body } = await get();
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.length, 620);
    assert.ok(!("meta" in body));
    assert.deepStrictEqual(calls.find[0].orderBy, [{ createdAt: "desc" }, { id: "asc" }]);
    assert.ok(!("skip" in calls.find[0]) && !("take" in calls.find[0]));
    assert.strictEqual(calls.count.length, 0);
  });

  test("page 2 de 25 : les équipements 26 à 50 et `meta`", async () => {
    const { status, body } = await get("?page=2&pageSize=25");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.length, 25);
    assert.strictEqual(body.data[0].id, "eq-25");
    assert.deepStrictEqual(body.meta, { total: 620, page: 2, pageSize: 25, totalPages: 25 });
  });

  test("page au-delà de la fin : `data` vide et même `meta`, sans erreur", async () => {
    const { status, body } = await get("?page=99&pageSize=25");
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(body.data, []);
    assert.strictEqual(body.meta.totalPages, 25);
    assert.strictEqual(body.meta.page, 99);
  });

  test("tri, filtres et période sont transmis à la requête", async () => {
    const { status } = await get("?page=1&q=chaise&status=A_COMPLETER&sort=purchaseDate&order=asc&from=2009-01-01&to=2009-12-31");
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(calls.find[0].orderBy, [{ purchaseDate: { sort: "asc", nulls: "last" } }, { id: "asc" }]);
    assert.strictEqual(calls.find[0].where.status, "A_COMPLETER");
    assert.ok(calls.find[0].where.purchaseDate.gte instanceof Date);
    assert.deepStrictEqual(calls.find[0].where, calls.count[0].where);
  });

  test("paramètres invalides : 400 et aucune lecture", async () => {
    for (const query of ["?pageSize=500", "?page=0", "?sort=name", "?order=up", "?from=2026-10-31&to=2026-10-01", "?from=2026-02-31", "?categoryId=x"]) {
      const { status, body } = await get(query);
      assert.strictEqual(status, 400, query);
      assert.strictEqual(body.success, false);
      assert.strictEqual(calls.find.length, 0, query);
    }
  });

  test("sans jeton : 401 ; secret interne : lecture complète toujours possible", async () => {
    assert.strictEqual((await get("", {})).status, 401);
    const internal = await get("", { "x-internal-token": "test-internal" });
    assert.strictEqual(internal.status, 200);
    assert.strictEqual(internal.body.data.length, 620);
  });

  test("liste vide : `meta.totalPages` vaut 0", async () => {
    total = 0;
    try {
      const { body } = await get("?page=1");
      assert.deepStrictEqual(body.data, []);
      assert.deepStrictEqual(body.meta, { total: 0, page: 1, pageSize: 25, totalPages: 0 });
    } finally {
      total = 620;
    }
  });
});
