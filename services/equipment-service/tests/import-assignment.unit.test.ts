import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { test, describe, before, beforeEach, after } from "node:test";
import {
  ASSIGN_BATCH_SIZE,
  autoAssign,
  personKey,
  resolveNames,
} from "../src/services/import-export/equipment-import-assignment";
import { buildEquipmentDrafts, resolveColumnMapping } from "../src/services/import-export/equipment-row.mapper";

const CHI = { id: "u-chi", firstName: "Chi George", lastName: "Mofor", isActive: true };
const MARIE = { id: "u-marie", firstName: "Marie", lastName: "Dupont", isActive: true };
const JEAN_A = { id: "u-jean-a", firstName: "Jean", lastName: "Martin", isActive: true };
const JEAN_B = { id: "u-jean-b", firstName: "Jean", lastName: "Martin", isActive: true };
const PAUL = { id: "u-paul", firstName: "Paul", lastName: "Ngono", isActive: false };
const USERS = [CHI, MARIE, JEAN_A, JEAN_B, PAUL];

// user-service et assignment-service simulés par un fetch de remplacement
type BulkCall = { equipmentIds: string[]; assigneeId: string; authorization: string | null };
let bulkCalls: BulkCall[] = [];
let usersResponse: () => Response = () => Response.json({ data: USERS });
let bulkResponse: (call: BulkCall) => Response | Promise<Response> = () => Response.json({ success: true }, { status: 201 });
const realFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    if (url.endsWith("/users")) return usersResponse();
    if (url.endsWith("/assignments/bulk")) {
      const body = JSON.parse(init.body);
      const call = { ...body, authorization: new Headers(init.headers).get("authorization") };
      bulkCalls.push(call);
      return bulkResponse(call);
    }
    throw new Error(`appel inattendu : ${url}`);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  bulkCalls = [];
  usersResponse = () => Response.json({ data: USERS });
  bulkResponse = () => Response.json({ success: true }, { status: 201 });
});

describe("Résolution des noms de bénéficiaires", () => {
  test("ignore la casse, les accents, la ponctuation et l'ordre prénom / nom", () => {
    assert.strictEqual(personKey("CHI GEORGE MOFOR"), personKey("Mofor Chi George"));
    assert.strictEqual(personKey("Mofor, Chi-George"), personKey("chi george mofor"));
    const resolutions = resolveNames(["CHI GEORGE MOFOR", "Mofor Chi George", "dupont marie"], USERS);
    assert.deepStrictEqual(resolutions.get("CHI GEORGE MOFOR"), { status: "FOUND", userId: "u-chi" });
    assert.deepStrictEqual(resolutions.get("Mofor Chi George"), { status: "FOUND", userId: "u-chi" });
    assert.deepStrictEqual(resolutions.get("dupont marie"), { status: "FOUND", userId: "u-marie" });
  });

  test("distingue introuvable, ambigu et désactivé", () => {
    const resolutions = resolveNames(["Inconnu Personne", "Jean Martin", "Paul Ngono"], USERS);
    assert.strictEqual(resolutions.get("Inconnu Personne")!.status, "NOT_FOUND");
    assert.strictEqual(resolutions.get("Jean Martin")!.status, "AMBIGUOUS");
    assert.strictEqual(resolutions.get("Paul Ngono")!.status, "INACTIVE");
  });
});

// Brouillons et équipements « créés » pour une liste de lignes { name, assignee, serial? }
const build = (lines: { name: string; assignee?: string; serial?: string; qty?: number }[]) => {
  const rows = lines.map((l, i) => ({
    rowNumber: i + 2,
    values: { Nom: l.name, SN: l.serial ?? null, Categorie: "Informatique", Quantite: l.qty ?? 1, Dispo: l.assignee ?? null },
  }));
  const { drafts, errors } = buildEquipmentDrafts(rows, resolveColumnMapping(["Nom", "SN", "Categorie", "Quantite", "Dispo"], { Dispo: "assigneeName" }));
  assert.deepStrictEqual(errors, []);
  const equipments = drafts.map((d) => ({ id: randomUUID(), serialNumber: d.serialNumber }));
  return { drafts, equipments };
};

describe("Affectation automatique après l'import", () => {
  test("regroupe les équipements par bénéficiaire et relaie le jeton de l'appelant", async () => {
    const { drafts, equipments } = build([
      { name: "Portable", serial: "SN-1", assignee: "CHI GEORGE MOFOR" },
      { name: "Écran", serial: "SN-2", assignee: "Mofor Chi George" },
      { name: "Clavier", serial: "SN-3", assignee: "Marie Dupont" },
    ]);
    const { assignedIds, unassigned } = await autoAssign(drafts, equipments, "Bearer jeton");
    assert.strictEqual(assignedIds.size, 3);
    assert.deepStrictEqual(unassigned, []);
    assert.strictEqual(bulkCalls.length, 2);
    const chiCall = bulkCalls.find((c) => c.assigneeId === "u-chi")!;
    assert.strictEqual(chiCall.equipmentIds.length, 2);
    assert.ok(bulkCalls.every((c) => c.authorization === "Bearer jeton"));
  });

  test("une cellule vide n'est ni affectée ni signalée, et aucun appel réseau n'a lieu", async () => {
    const { drafts, equipments } = build([{ name: "Portable", serial: "SN-1" }]);
    const result = await autoAssign(drafts, equipments, "Bearer jeton");
    assert.strictEqual(result.assignedIds.size, 0);
    assert.deepStrictEqual(result.unassigned, []);
    assert.strictEqual(bulkCalls.length, 0);
  });

  test("découpe en lots de 200 et un lot refusé n'annule pas les autres", async () => {
    // 250 équipements pour un même bénéficiaire : 2 lots
    const bulk = Array.from({ length: ASSIGN_BATCH_SIZE + 50 }, (_, i) => ({
      name: `Lot ${i}`,
      serial: `SN-LOT-${i}`,
      assignee: "Chi George Mofor",
    }));
    const big = build(bulk);
    let call = 0;
    bulkResponse = () => (++call === 1 ? Response.json({ error: { message: "refusé" } }, { status: 409 }) : Response.json({}, { status: 201 }));
    const result = await autoAssign(big.drafts, big.equipments, "Bearer jeton");
    assert.deepStrictEqual(bulkCalls.map((c) => c.equipmentIds.length), [ASSIGN_BATCH_SIZE, 50]);
    assert.strictEqual(result.assignedIds.size, 50);
    assert.strictEqual(result.unassigned.reduce((sum, u) => sum + u.count, 0), ASSIGN_BATCH_SIZE);
    assert.ok(result.unassigned.every((u) => u.reason === "ASSIGNMENT_REFUSED"));
  });

  test("rapporte nom inconnu, ambigu, désactivé et équipement à compléter", async () => {
    const { drafts, equipments } = build([
      { name: "A", serial: "SN-A", assignee: "Inconnu Personne" },
      { name: "B", serial: "SN-B", assignee: "Jean Martin" },
      { name: "C", serial: "SN-C", assignee: "Paul Ngono" },
      { name: "D", assignee: "Chi George Mofor", qty: 2 }, // sans numéro de série : A_COMPLETER
    ]);
    const { assignedIds, unassigned } = await autoAssign(drafts, equipments, "Bearer jeton");
    assert.strictEqual(assignedIds.size, 0);
    assert.strictEqual(bulkCalls.length, 0);
    assert.deepStrictEqual(
      unassigned.map((u) => [u.row, u.reason, u.count]),
      [
        [2, "USER_NOT_FOUND", 1],
        [3, "USER_AMBIGUOUS", 1],
        [4, "USER_INACTIVE", 1],
        [5, "EQUIPMENT_TO_COMPLETE", 2],
      ]
    );
  });

  test("service d'affectation indisponible : équipements conservés, raison ASSIGNMENT_UNAVAILABLE", async () => {
    bulkResponse = () => {
      throw new Error("ECONNREFUSED");
    };
    const { drafts, equipments } = build([{ name: "A", serial: "SN-A", assignee: "Marie Dupont" }]);
    const { assignedIds, unassigned } = await autoAssign(drafts, equipments, "Bearer jeton");
    assert.strictEqual(assignedIds.size, 0);
    assert.strictEqual(unassigned[0].reason, "ASSIGNMENT_UNAVAILABLE");
  });

  test("user-service indisponible ou jeton absent : toutes les lignes nommées sont signalées", async () => {
    usersResponse = () => new Response("panne", { status: 503 });
    const { drafts, equipments } = build([{ name: "A", serial: "SN-A", assignee: "Marie Dupont" }]);
    const down = await autoAssign(drafts, equipments, "Bearer jeton");
    assert.strictEqual(down.unassigned[0].reason, "ASSIGNMENT_UNAVAILABLE");

    usersResponse = () => Response.json({ data: USERS });
    const noToken = await autoAssign(drafts, equipments, undefined);
    assert.strictEqual(noToken.unassigned[0].reason, "ASSIGNMENT_UNAVAILABLE");
    assert.strictEqual(bulkCalls.length, 0);
  });
});

describe("Import complet avec affectation automatique", () => {
  test("crée tout, n'affecte que la ligne reconnue et liste les trois autres", async () => {
    const { prisma } = await import("../src/config/prisma");
    const { equipmentImportService } = await import("../src/services/import-export/equipment-import.service");

    // Base simulée : l'insertion attribue des identifiants et renvoie les équipements créés
    const created: any[] = [];
    (prisma as any).equipment = { findMany: async () => [] };
    (prisma as any).$transaction = async (callback: any) =>
      callback({
        category: { findMany: async () => [], create: async ({ data }: any) => ({ id: `cat-${data.name}`, name: data.name }) },
        supplier: { findMany: async () => [], create: async ({ data }: any) => ({ id: `sup-${data.name}`, name: data.name }) },
        equipment: {
          createManyAndReturn: async ({ data }: any) => {
            const rows = data.map((d: any) => ({ id: randomUUID(), ...d }));
            created.push(...rows);
            return rows;
          },
        },
      });

    const csv = Buffer.from(
      [
        "Nom;N° de série;Catégorie;MIS A LA DIPOSITION DE",
        "Portable Dell;SN-E2E-1;Informatique;CHI GEORGE MOFOR",
        "Écran;SN-E2E-2;Informatique;Personne Inconnue",
        "Souris;SN-E2E-3;Informatique;Jean Martin",
        "Clavier;;Informatique;Marie Dupont",
      ].join("\n"),
      "utf8"
    );
    const result = await equipmentImportService.import({ buffer: csv, originalname: "parc.csv" }, undefined, "Bearer jeton");

    assert.strictEqual(result.createdCount, 4);
    assert.strictEqual(created.length, 4);
    assert.strictEqual(result.assignedCount, 1);
    assert.deepStrictEqual(
      result.unassigned.map((u) => [u.row, u.assigneeName, u.reason]),
      [
        [3, "Personne Inconnue", "USER_NOT_FOUND"],
        [4, "Jean Martin", "USER_AMBIGUOUS"],
        [5, "Marie Dupont", "EQUIPMENT_TO_COMPLETE"],
      ]
    );
    assert.strictEqual(bulkCalls.length, 1);
    assert.strictEqual(bulkCalls[0].assigneeId, "u-chi");
    // Le rapport affiche le statut réel, et rien n'est enregistré des données de rapprochement
    assert.deepStrictEqual(result.equipments.map((e: any) => e.status), ["ASSIGNED", "AVAILABLE", "AVAILABLE", "A_COMPLETER"]);
    assert.ok(created.every((row) => !("assigneeName" in row) && !("sourceRow" in row)));
  });
});
