import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

import { buildMeta, readPagination } from "../src/utils/pagination";
import { parseAuditListQuery } from "../src/validators/audit-list.validator";

const refused = (fn: () => unknown, pattern?: RegExp) =>
  assert.throws(fn, (err: any) => err.statusCode === 400 && err.code === "VALIDATION_ERROR" && (!pattern || pattern.test(err.message)));

describe("Journal d'audit : pagination et filtres (validation)", () => {
  test("sans page ni pageSize : null (liste complète, format d'avant)", () => {
    assert.strictEqual(readPagination({}), null);
    assert.strictEqual(parseAuditListQuery({}).pagination, null);
  });

  test("valeurs par défaut, bornes de pageSize et pages invalides", () => {
    assert.deepStrictEqual(readPagination({ page: "2" }), { page: 2, pageSize: 25, skip: 25, take: 25 });
    assert.strictEqual(readPagination({ pageSize: "100" })!.take, 100);
    refused(() => readPagination({ pageSize: "0" }), /pageSize/);
    refused(() => readPagination({ pageSize: "101" }), /pageSize/);
    refused(() => readPagination({ page: "0" }), /page/);
    refused(() => readPagination({ page: "abc" }));
    refused(() => readPagination({ page: ["1", "2"] }));
  });

  test("meta : total, page, taille et nombre de pages", () => {
    assert.deepStrictEqual(buildMeta(96, readPagination({ page: "1", pageSize: "25" })!), {
      total: 96,
      page: 1,
      pageSize: 25,
      totalPages: 4,
    });
  });

  test("catégories valides, catégorie inconnue refusée", () => {
    for (const category of ["AUTHENTICATION", "DATA_MUTATION", "SYSTEM_EVENT"]) {
      assert.strictEqual(parseAuditListQuery({ category }).category, category);
    }
    refused(() => parseAuditListQuery({ category: "AUTRE" }), /category/);
    refused(() => parseAuditListQuery({ category: ["AUTHENTICATION", "SYSTEM_EVENT"] }));
  });

  test("jour : AAAA-MM-JJ valide uniquement (31/02 et formats français refusés)", () => {
    assert.strictEqual(parseAuditListQuery({ date: "2026-10-02" }).date, "2026-10-02");
    refused(() => parseAuditListQuery({ date: "2026-02-31" }), /date/);
    refused(() => parseAuditListQuery({ date: "02/10/2026" }));
    refused(() => parseAuditListQuery({ date: "2026-10-02T10:00" }));
  });

  test("recherche nettoyée et limitée à 100 caractères", () => {
    assert.strictEqual(parseAuditListQuery({ q: "  admin " }).q, "admin");
    assert.strictEqual(parseAuditListQuery({ q: "  " }).q, undefined);
    refused(() => parseAuditListQuery({ q: "x".repeat(101) }));
  });
});

describe("Journal d'audit : requête Prisma produite", () => {
  const repo = async () => await import("../src/repositories/audit-log.repository");

  test("sans filtre, le « where » est vide", async () => {
    const { buildAuditWhere } = await repo();
    assert.deepStrictEqual(buildAuditWhere(parseAuditListQuery({})), {});
  });

  test("recherche : acteur, identifiant d'entité ou identifiant du journal, casse ignorée", async () => {
    const { buildAuditWhere } = await repo();
    assert.deepStrictEqual(buildAuditWhere(parseAuditListQuery({ q: "adm" })), {
      AND: [
        {
          OR: [
            { performedBy: { contains: "adm", mode: "insensitive" } },
            { entityId: { contains: "adm", mode: "insensitive" } },
            { id: { contains: "adm", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  test("catégories : mêmes correspondances d'actions que l'ancienne page", async () => {
    const { buildAuditWhere } = await repo();
    const words = (category: string) =>
      (buildAuditWhere(parseAuditListQuery({ category })) as any).AND[0].OR.map((c: any) => c.action.contains);
    assert.deepStrictEqual(words("AUTHENTICATION"), ["AUTH", "LOGIN", "LOGOUT"]);
    assert.deepStrictEqual(words("DATA_MUTATION"), ["CREATE", "UPDATE", "DELETE", "TRANSFER", "RETURN"]);
    assert.deepStrictEqual(words("SYSTEM_EVENT"), ["SYSTEM", "MAINTENANCE", "INVENTORY"]);
  });

  test("jour : toute la journée UTC, combiné aux autres filtres", async () => {
    const { buildAuditWhere } = await repo();
    const where: any = buildAuditWhere(parseAuditListQuery({ date: "2026-10-02", category: "AUTHENTICATION" }));
    assert.strictEqual(where.AND.length, 2);
    assert.deepStrictEqual(where.AND[1].createdAt, {
      gte: new Date("2026-10-02T00:00:00.000Z"),
      lte: new Date("2026-10-02T23:59:59.999Z"),
    });
  });

  test("findPage : plus récents d'abord (puis identifiant), skip, take et même where pour la page et le total", async () => {
    const { auditLogRepository } = await repo();
    const { prisma } = await import("../src/config/prisma");
    const calls: any[] = [];
    (prisma as any).auditLog = {
      findMany: (args: any) => (calls.push(args), Promise.resolve([{ id: "l1" }])),
      count: (args: any) => (calls.push(args), Promise.resolve(96)),
    };
    (prisma as any).$transaction = (operations: Promise<unknown>[]) => Promise.all(operations);
    const result = await auditLogRepository.findPage(parseAuditListQuery({ page: "3", pageSize: "10", category: "SYSTEM_EVENT" }));
    assert.deepStrictEqual(result, { rows: [{ id: "l1" }], total: 96 });
    assert.deepStrictEqual(calls[0].orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
    assert.strictEqual(calls[0].skip, 20);
    assert.strictEqual(calls[0].take, 10);
    assert.deepStrictEqual(calls[0].where, calls[1].where);
  });

  test("summary : quatre comptes sur tout le journal, sans filtre", async () => {
    const { auditLogRepository } = await repo();
    const { prisma } = await import("../src/config/prisma");
    const wheres: any[] = [];
    (prisma as any).auditLog = {
      count: (args?: any) => (wheres.push(args?.where), Promise.resolve(wheres.length * 10)),
    };
    const summary = await auditLogRepository.summary();
    assert.deepStrictEqual(summary, { total: 10, authCount: 20, mutationCount: 30, failedCount: 40 });
    assert.strictEqual(wheres[0], undefined);
    const failed = wheres[3].OR;
    assert.deepStrictEqual(failed[0], { action: { contains: "FAILED" } });
    assert.deepStrictEqual(failed[1], { metadata: { path: ["status"], equals: "FAILED" } });
    assert.deepStrictEqual(failed[2], { metadata: { path: ["success"], equals: false } });
  });
});

describe("GET /audit-logs : pagination, accès et journaux d'exemple", () => {
  let server: http.Server;
  let base: string;
  let created: unknown[] = [];
  let tableRows = 96;
  let findCalls: any[] = [];

  const token = (claims: Record<string, unknown> = { id: "u1", role: "EMPLOYE", permissions: [] }) =>
    `Bearer ${jwt.sign(claims, "test-secret", { expiresIn: "5m" })}`;

  before(async () => {
    const { prisma } = await import("../src/config/prisma");
    (prisma as any).auditLog = {
      findMany: (args: any) => {
        findCalls.push(args);
        const start = args.skip ?? 0;
        const size = args.take ?? tableRows;
        return Promise.resolve(Array.from({ length: Math.max(0, Math.min(size, tableRows - start)) }, (_, i) => ({ id: `log-${start + i}` })));
      },
      count: () => Promise.resolve(tableRows),
      create: ({ data }: any) => (created.push(data), tableRows++, Promise.resolve({ id: "new", ...data })),
    };
    (prisma as any).$transaction = (operations: Promise<unknown>[]) => Promise.all(operations);
    const app = (await import("../src/app")).default;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/audit-logs`;
  });
  after(() => server.close());

  const get = async (query = "", headers: Record<string, string> = { Authorization: token() }) => {
    findCalls = [];
    created = [];
    const res = await fetch(`${base}${query}`, { headers });
    return { status: res.status, body: (await res.json()) as any };
  };

  test("première page : 25 journaux, `meta` et `summary` de tout le journal", async () => {
    const { status, body } = await get("?page=1&pageSize=25");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.length, 25);
    assert.deepStrictEqual(body.meta, { total: 96, page: 1, pageSize: 25, totalPages: 4 });
    assert.deepStrictEqual(Object.keys(body.summary).sort(), ["authCount", "failedCount", "mutationCount", "total"]);
    assert.strictEqual(body.summary.total, 96);
    assert.deepStrictEqual(findCalls[0].orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  });

  test("sans paramètre : liste complète, `data` seul, comme avant", async () => {
    const { status, body } = await get();
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.length, 96);
    assert.ok(!("meta" in body) && !("summary" in body));
  });

  test("paramètres invalides : 400 et aucune lecture", async () => {
    for (const query of ["?pageSize=101", "?page=0", "?category=AUTRE", "?date=2026-02-31", "?date=02/10/2026"]) {
      const { status, body } = await get(query);
      assert.strictEqual(status, 400, query);
      assert.strictEqual(body.code, "VALIDATION_ERROR");
      assert.strictEqual(findCalls.length, 0, query);
    }
  });

  test("sans jeton ou sans identité valide : refus, aucun journal renvoyé", async () => {
    const noToken = await get("?page=1", {});
    assert.strictEqual(noToken.status, 401);
    const noRole = await get("?page=1", { Authorization: token({ id: "u1" }) });
    assert.ok([401, 403].includes(noRole.status), `statut ${noRole.status}`);
    assert.ok(!("data" in noRole.body));
  });

  test("filtre ou page sans résultat : aucun journal d'exemple créé", async () => {
    const savedRows = tableRows;
    tableRows = 0;
    try {
      const filtered = await get("?page=1&date=2026-10-02&category=AUTHENTICATION");
      assert.strictEqual(filtered.status, 200);
      assert.deepStrictEqual(filtered.body.data, []);
      assert.deepStrictEqual(created, []);

      const unpagedFiltered = await get("?category=AUTHENTICATION");
      assert.deepStrictEqual(unpagedFiltered.body.data, []);
      assert.deepStrictEqual(created, []);
    } finally {
      tableRows = savedRows;
    }
  });

  test("lecture complète sans paramètre d'une table vide : journaux d'exemple conservés (comportement existant)", async () => {
    const savedRows = tableRows;
    tableRows = 0;
    try {
      await get();
      assert.strictEqual(created.length, 4);
    } finally {
      tableRows = savedRows;
    }
  });
});
