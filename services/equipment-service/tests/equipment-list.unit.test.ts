import assert from "node:assert";
import { test, describe } from "node:test";

import { buildMeta, readPagination } from "../src/utils/pagination";
import { parseEquipmentListQuery } from "../src/validators/equipment-list.validator";

const refused = (fn: () => unknown, pattern?: RegExp) =>
  assert.throws(fn, (err: any) => err.statusCode === 400 && (!pattern || pattern.test(err.message)));

describe("Pagination : lecture des paramètres", () => {
  test("sans page ni pageSize : null (liste complète, format d'avant)", () => {
    assert.strictEqual(readPagination({}), null);
    assert.strictEqual(readPagination({ page: "", pageSize: "" }), null);
    assert.strictEqual(readPagination({ q: "x" }), null);
  });

  test("valeurs par défaut quand un seul paramètre est fourni", () => {
    assert.deepStrictEqual(readPagination({ page: "3" }), { page: 3, pageSize: 25, skip: 50, take: 25 });
    assert.deepStrictEqual(readPagination({ pageSize: "10" }), { page: 1, pageSize: 10, skip: 0, take: 10 });
  });

  test("bornes de pageSize : 1 et 100 acceptés, 0 et 101 refusés", () => {
    assert.strictEqual(readPagination({ pageSize: "1" })!.take, 1);
    assert.strictEqual(readPagination({ pageSize: "100" })!.take, 100);
    refused(() => readPagination({ pageSize: "0" }), /pageSize/);
    refused(() => readPagination({ pageSize: "101" }), /pageSize/);
    refused(() => readPagination({ pageSize: "500" }));
  });

  test("page : 0, négative, décimale, texte ou répétée sont refusées", () => {
    refused(() => readPagination({ page: "0" }), /page/);
    refused(() => readPagination({ page: "-1" }));
    refused(() => readPagination({ page: "1.5" }));
    refused(() => readPagination({ page: "abc" }));
    refused(() => readPagination({ page: ["1", "2"] }));
  });

  test("meta : total, page, taille et nombre de pages", () => {
    const pagination = readPagination({ page: "2", pageSize: "25" })!;
    assert.deepStrictEqual(buildMeta(620, pagination), { total: 620, page: 2, pageSize: 25, totalPages: 25 });
    assert.strictEqual(buildMeta(0, pagination).totalPages, 0);
    assert.strictEqual(buildMeta(26, pagination).totalPages, 2);
  });
});

describe("Liste des équipements : tri, filtres et période", () => {
  test("valeurs par défaut : tri par date d'ajout décroissante, aucun filtre", () => {
    const parsed = parseEquipmentListQuery({});
    assert.strictEqual(parsed.pagination, null);
    assert.strictEqual(parsed.sort, "createdAt");
    assert.strictEqual(parsed.order, "desc");
    assert.strictEqual(parsed.q, undefined);
    assert.strictEqual(parsed.from, undefined);
  });

  test("accepte les quatre dates de tri et les deux sens", () => {
    for (const sort of ["createdAt", "purchaseDate", "commissionedAt", "updatedAt"]) {
      for (const order of ["asc", "desc"]) {
        const parsed = parseEquipmentListQuery({ sort, order });
        assert.strictEqual(parsed.sort, sort);
        assert.strictEqual(parsed.order, order);
      }
    }
  });

  test("refuse un champ de tri ou un sens inconnu", () => {
    refused(() => parseEquipmentListQuery({ sort: "name" }), /sort/);
    refused(() => parseEquipmentListQuery({ sort: "price; DROP TABLE" }));
    refused(() => parseEquipmentListQuery({ order: "up" }), /order/);
  });

  test("une date seule couvre toute la journée UTC", () => {
    const { from, to } = parseEquipmentListQuery({ from: "2026-10-01", to: "2026-10-31" });
    assert.strictEqual(from!.toISOString(), "2026-10-01T00:00:00.000Z");
    assert.strictEqual(to!.toISOString(), "2026-10-31T23:59:59.999Z");
  });

  test("accepte une date-heure ISO et une seule borne", () => {
    const parsed = parseEquipmentListQuery({ from: "2026-10-01T00:30:00+01:00" });
    assert.strictEqual(parsed.from!.toISOString(), "2026-09-30T23:30:00.000Z");
    assert.strictEqual(parsed.to, undefined);
  });

  test("refuse une date impossible ou illisible", () => {
    refused(() => parseEquipmentListQuery({ from: "2026-02-31" }), /from/);
    refused(() => parseEquipmentListQuery({ to: "hier" }), /to/);
    refused(() => parseEquipmentListQuery({ from: "01/10/2026" }));
  });

  test("refuse une période dont le début est postérieur à la fin", () => {
    refused(() => parseEquipmentListQuery({ from: "2026-10-31", to: "2026-10-01" }), /postérieure/);
    assert.doesNotThrow(() => parseEquipmentListQuery({ from: "2026-10-01", to: "2026-10-01" }));
  });

  test("recherche nettoyée, catégorie en UUID, statut en texte", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const parsed = parseEquipmentListQuery({ q: "  chaise ", categoryId: id, status: "A_COMPLETER" });
    assert.deepStrictEqual([parsed.q, parsed.categoryId, parsed.status], ["chaise", id, "A_COMPLETER"]);
    refused(() => parseEquipmentListQuery({ categoryId: "pas-un-uuid" }), /categoryId/);
    refused(() => parseEquipmentListQuery({ q: "x".repeat(101) }));
    assert.strictEqual(parseEquipmentListQuery({ q: "   " }).q, undefined);
  });

  test("un paramètre répété est refusé", () => {
    refused(() => parseEquipmentListQuery({ sort: ["createdAt", "updatedAt"] }));
  });
});

describe("Liste des équipements : requête Prisma produite", () => {
  const repository = async () => await import("../src/repositories/equipment.repository");
  const parse = (query: Record<string, unknown>) => parseEquipmentListQuery(query);

  test("sans filtre, le « where » est vide", async () => {
    const { buildEquipmentWhere } = await repository();
    assert.deepStrictEqual(buildEquipmentWhere(parse({})), {});
  });

  test("la recherche porte sur le nom, le numéro de série et la catégorie, sans tenir compte de la casse", async () => {
    const { buildEquipmentWhere } = await repository();
    assert.deepStrictEqual(buildEquipmentWhere(parse({ q: "chaise" })), {
      OR: [
        { name: { contains: "chaise", mode: "insensitive" } },
        { serialNumber: { contains: "chaise", mode: "insensitive" } },
        { category: { name: { contains: "chaise", mode: "insensitive" } } },
      ],
    });
  });

  test("catégorie, statut et période se combinent ; la période porte sur le champ de tri", async () => {
    const { buildEquipmentWhere } = await repository();
    const id = "11111111-1111-4111-8111-111111111111";
    const where = buildEquipmentWhere(
      parse({ q: "x", categoryId: id, status: "A_COMPLETER", sort: "purchaseDate", from: "2009-01-01", to: "2009-12-31" })
    );
    assert.strictEqual(where.categoryId, id);
    assert.strictEqual(where.status, "A_COMPLETER");
    assert.deepStrictEqual((where as any).purchaseDate, {
      gte: new Date("2009-01-01T00:00:00.000Z"),
      lte: new Date("2009-12-31T23:59:59.999Z"),
    });
    assert.ok(where.OR);
  });

  test("une seule borne ne produit qu'une comparaison", async () => {
    const { buildEquipmentWhere } = await repository();
    const where: any = buildEquipmentWhere(parse({ from: "2026-10-01" }));
    assert.deepStrictEqual(Object.keys(where.createdAt), ["gte"]);
  });

  test("tri : dates facultatives avec valeurs nulles en fin de liste, dates toujours renseignées sans, puis identifiant", async () => {
    const { buildEquipmentOrderBy } = await repository();
    assert.deepStrictEqual(buildEquipmentOrderBy(parse({ sort: "purchaseDate", order: "asc" })), [
      { purchaseDate: { sort: "asc", nulls: "last" } },
      { id: "asc" },
    ]);
    assert.deepStrictEqual(buildEquipmentOrderBy(parse({ sort: "commissionedAt" })), [
      { commissionedAt: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ]);
    assert.deepStrictEqual(buildEquipmentOrderBy(parse({})), [{ createdAt: "desc" }, { id: "asc" }]);
    assert.deepStrictEqual(buildEquipmentOrderBy(parse({ sort: "updatedAt", order: "asc" })), [
      { updatedAt: "asc" },
      { id: "asc" },
    ]);
  });

  test("findPage : transmet skip et take, utilise le même where pour la page et le total", async () => {
    const { equipmentRepository } = await repository();
    const { prisma } = await import("../src/config/prisma");
    const calls: any[] = [];
    (prisma as any).equipment = {
      findMany: (args: any) => (calls.push(["findMany", args]), Promise.resolve([{ id: "a" }])),
      count: (args: any) => (calls.push(["count", args]), Promise.resolve(620)),
    };
    (prisma as any).$transaction = (operations: Promise<unknown>[]) => Promise.all(operations);

    const result = await equipmentRepository.findPage(parse({ page: "3", pageSize: "10", status: "AVAILABLE" }));
    assert.deepStrictEqual(result, { rows: [{ id: "a" }], total: 620 });
    const [find, count] = calls;
    assert.strictEqual(find[1].skip, 20);
    assert.strictEqual(find[1].take, 10);
    assert.deepStrictEqual(find[1].where, count[1].where);
    assert.deepStrictEqual(find[1].where, { status: "AVAILABLE" });
  });

  test("findAll sans paramètre : liste complète triée par date d'ajout décroissante, sans skip ni take", async () => {
    const { equipmentRepository } = await repository();
    const { prisma } = await import("../src/config/prisma");
    let received: any;
    (prisma as any).equipment = { findMany: (args: any) => ((received = args), Promise.resolve([])) };
    await equipmentRepository.findAll();
    assert.deepStrictEqual(received.orderBy, [{ createdAt: "desc" }, { id: "asc" }]);
    assert.ok(!("skip" in received) && !("take" in received));
  });
});
