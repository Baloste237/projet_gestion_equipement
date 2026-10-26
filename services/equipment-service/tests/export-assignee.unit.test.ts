import assert from "node:assert";
import { test, describe, before, beforeEach, after } from "node:test";
import { resolveColumnMapping } from "../src/services/import-export/equipment-row.mapper";

const EQ_USER = "e1111111-1111-4111-8111-111111111111";
const EQ_DEPT = "e2222222-2222-4222-8222-222222222222";
const EQ_FREE = "e3333333-3333-4333-8333-333333333333";

const ACTIVE = [
  { equipmentId: EQ_USER, assigneeType: "USER", assigneeId: "u-chi" },
  { equipmentId: EQ_DEPT, assigneeType: "DEPARTMENT", assigneeId: "d-it" },
];
const USERS = [{ id: "u-chi", firstName: "Chi George", lastName: "Mofor", isActive: true }];
const DEPARTMENTS = [{ id: "d-it", name: "Informatique" }];

const equipment = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  serialNumber: `SN-${name}`,
  status: "AVAILABLE",
  condition: "FONCTIONNEL",
  commissionedAt: null,
  decommissionedAt: null,
  barcode: null,
  brand: null,
  model: null,
  location: null,
  purchaseDate: null,
  purchasePrice: null,
  warrantyEndDate: null,
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  category: { name: "Informatique" },
  supplier: null,
  ...extra,
});

// Services distants simulés : chaque source peut être mise en panne indépendamment
let down: Set<string>;
let authorizations: (string | null)[];
const realFetch = globalThis.fetch;

const respond = (source: string, data: unknown) =>
  down.has(source) ? new Response("panne", { status: 503 }) : Response.json({ data });

before(async () => {
  const { prisma } = await import("../src/config/prisma");
  (prisma as any).equipment = {
    findMany: async () => [
      equipment(EQ_USER, "Portable", {
        condition: "NON_FONCTIONNEL",
        commissionedAt: new Date("2024-01-10T00:00:00Z"),
        decommissionedAt: new Date("2025-06-30T00:00:00Z"),
      }),
      equipment(EQ_DEPT, "Écran"),
      equipment(EQ_FREE, "Clavier"),
    ],
  };
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    authorizations.push(new Headers(init?.headers).get("authorization"));
    if (url.endsWith("/assignments/active-summary")) return respond("assignments", ACTIVE);
    if (url.endsWith("/users")) return respond("users", USERS);
    if (url.endsWith("/departments")) return respond("departments", DEPARTMENTS);
    if (url.endsWith("/positions")) return respond("positions", []);
    throw new Error(`appel inattendu : ${url}`);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  down = new Set();
  authorizations = [];
});

const exportCsv = async (authorization: string = "Bearer jeton") => {
  const { equipmentExportService } = await import("../src/services/import-export/equipment-export.service");
  const file = await equipmentExportService.export("csv", authorization);
  const [header, ...lines] = file.buffer.toString("utf8").replace(/^﻿/, "").trim().split("\r\n");
  const columns = header.split(";");
  const rows = lines.map((line) => Object.fromEntries(line.split(";").map((cell, i) => [columns[i], cell])));
  return { columns, rows };
};

describe("Export : état, dates de service et bénéficiaire", () => {
  test("contient les colonnes et les valeurs, avec le nom de l'utilisateur ou du département", async () => {
    const { columns, rows } = await exportCsv();
    for (const column of ["ETAT", "DATE DE MISE EN SERVICE", "DATE DE MISE HORS SERVICE", "MIS A LA DISPOSITION DE"]) {
      assert.ok(columns.includes(column), column);
    }
    const [portable, ecran, clavier] = rows;
    assert.strictEqual(portable["ETAT"], "NON_FONCTIONNEL");
    assert.strictEqual(portable["DATE DE MISE EN SERVICE"], "2024-01-10");
    assert.strictEqual(portable["DATE DE MISE HORS SERVICE"], "2025-06-30");
    assert.strictEqual(portable["MIS A LA DISPOSITION DE"], "Chi George Mofor");
    assert.strictEqual(ecran["MIS A LA DISPOSITION DE"], "Informatique");
    assert.strictEqual(clavier["MIS A LA DISPOSITION DE"], "");
    assert.ok(authorizations.includes("Bearer jeton"));
  });

  test("les en-têtes exportés sont reconnus par l'import", async () => {
    const { columns } = await exportCsv();
    const mapping = resolveColumnMapping(columns);
    assert.strictEqual(mapping.condition, "ETAT");
    assert.strictEqual(mapping.commissionedAt, "DATE DE MISE EN SERVICE");
    assert.strictEqual(mapping.decommissionedAt, "DATE DE MISE HORS SERVICE");
    assert.strictEqual(mapping.assigneeName, "MIS A LA DISPOSITION DE");
  });

  test("assignment-service indisponible : export complet, colonne bénéficiaire vide", async () => {
    down.add("assignments");
    const { rows } = await exportCsv();
    assert.strictEqual(rows.length, 3);
    assert.ok(rows.every((row) => row["MIS A LA DISPOSITION DE"] === ""));
    assert.strictEqual(rows[0]["ETAT"], "NON_FONCTIONNEL");
  });

  test("user-service indisponible : export complet, noms absents", async () => {
    down.add("users").add("departments").add("positions");
    const { rows } = await exportCsv();
    assert.strictEqual(rows.length, 3);
    assert.ok(rows.every((row) => row["MIS A LA DISPOSITION DE"] === ""));
  });

  test("un seul type d'assigné illisible : les autres noms sont conservés", async () => {
    down.add("departments");
    const { rows } = await exportCsv();
    assert.strictEqual(rows[0]["MIS A LA DISPOSITION DE"], "Chi George Mofor");
    assert.strictEqual(rows[1]["MIS A LA DISPOSITION DE"], "");
  });

  test("sans jeton : aucun appel distant, export non bloqué", async () => {
    const { rows } = await exportCsv("");
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(authorizations.length, 0);
  });
});
