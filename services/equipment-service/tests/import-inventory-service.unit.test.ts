import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test, describe, before } from "node:test";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name));
const asFile = (buffer: Buffer, originalname: string) => ({ buffer, originalname });

type Service = (typeof import("../src/services/import-export/equipment-import.service"))["equipmentImportService"];

describe("Import d'un fichier d'inventaire (service)", () => {
  let service: Service;
  const created: any[] = [];
  const categories: string[] = [];
  let transactions = 0;

  before(async () => {
    const { prisma } = await import("../src/config/prisma");
    service = (await import("../src/services/import-export/equipment-import.service")).equipmentImportService;
    // Base simulée : l'insertion attribue des identifiants et renvoie les équipements créés
    (prisma as any).equipment = { findMany: async () => [] };
    (prisma as any).$transaction = async (callback: any) => {
      transactions++;
      return callback({
        category: {
          findMany: async () => [],
          create: async ({ data }: any) => {
            categories.push(data.name);
            return { id: `cat-${data.name}`, name: data.name };
          },
        },
        supplier: { findMany: async () => [], create: async ({ data }: any) => ({ id: `sup-${data.name}`, name: data.name }) },
        equipment: {
          createManyAndReturn: async ({ data }: any) => {
            const rows = data.map((d: any) => ({ id: randomUUID(), ...d }));
            created.push(...rows);
            return rows;
          },
        },
      });
    };
  });

  test("aperçu : en-tête en ligne 5, lignes ignorées, colonnes reconnues", async () => {
    const preview = await service.preview(asFile(fixture("import-inventory.csv"), "import-inventory.csv"));
    assert.strictEqual(preview.headerRow, 5);
    assert.strictEqual(preview.ignoredRowCount, 4);
    assert.strictEqual(preview.rowCount, 4);
    assert.strictEqual(preview.headers[0], "IDENTIFIANT");
    assert.strictEqual(preview.suggestedMapping["CATEGORIE"], "category");
    assert.strictEqual(preview.suggestedMapping["MONTANT"], "purchasePrice");
    assert.strictEqual(preview.suggestedMapping["DATE D'ACQUISITION"], "purchaseDate");
    assert.strictEqual(preview.suggestedMapping["CARACTERISTIQUES"], "notes");
    assert.strictEqual(preview.suggestedMapping["OBSERVATIONS / HISTORIQUE"], "notes");
    assert.ok(!("IDENTIFIANT" in preview.suggestedMapping));
    assert.strictEqual(preview.sampleRows[0].row, 6);
  });

  test("aperçu d'un fichier dont l'en-tête est en ligne 1 : ligne 1, aucune ligne ignorée", async () => {
    const preview = await service.preview(asFile(fixture("import-sample.csv"), "import-sample.csv"));
    assert.strictEqual(preview.headerRow, 1);
    assert.strictEqual(preview.ignoredRowCount, 0);
  });

  test("import complet : 6 équipements, catégories créées, rien venant de la liste de valeurs", async () => {
    const result = await service.import(asFile(fixture("import-inventory.csv"), "import-inventory.csv"));

    assert.strictEqual(result.headerRow, 5);
    assert.strictEqual(result.ignoredRowCount, 4);
    assert.strictEqual(result.createdCount, 6);
    assert.strictEqual(result.toCompleteCount, 6);
    assert.strictEqual(created.length, 6);
    assert.deepStrictEqual([...new Set(categories)].sort(), ["ARMOIRE", "CHAISE", "CLAVIER", "CLIMATISEUR"]);
    assert.ok(!created.some((row) => JSON.stringify(row).includes("AGRAFEUSE")));

    const chairs = created.filter((row) => row.name === "CHAISE");
    assert.strictEqual(chairs.length, 3);
    assert.ok(chairs.every((row) => row.purchasePrice === 19500 && row.barcode === "Mob-Cha-002"));
    assert.strictEqual(created.find((row) => row.name === "HP").notes, "CLAVIER USB | RECENT");
    assert.ok(created.every((row) => !("sourceRow" in row) && !("assigneeName" in row)));
  });

  test("une ligne mal saisie refuse tout l'import avec son numéro de ligne d'origine, sans rien créer", async () => {
    const before = { transactions, created: created.length };
    const bad = Buffer.from(
      [
        "TITRE DU FICHIER;;;",
        ";;;",
        "CATEGORIE;QUANTITE;DATE DE MISE EN SERVICE;MONTANT",
        "CHAISE;1;;19.500 F",
        "TABLE;1;pas une date;sur devis",
      ].join("\n"),
      "utf8"
    );
    await assert.rejects(service.import(asFile(bad, "mal-saisi.csv")), (err: any) => {
      assert.strictEqual(err.statusCode, 400);
      const rows = (err.details as { row: number; message: string }[]).map((d) => d.row);
      assert.deepStrictEqual([...new Set(rows)], [5]);
      assert.deepStrictEqual(
        (err.details as { message: string }[]).map((d) => d.message).sort(),
        ["Date de mise en service invalide", "Prix invalide"]
      );
      return true;
    });
    assert.deepStrictEqual({ transactions, created: created.length }, before);
  });

  test("un mapping personnalisé aide à repérer l'en-tête et prime sur les alias", async () => {
    const csv = Buffer.from("Inventaire annuel;;\nRéf interne;Désignation;Qté\nA-1;Chaise;2\n", "utf8");
    const mapping = JSON.stringify({ "Réf interne": "serialNumber", Désignation: "name", Qté: "quantity" });
    const result = await service.import(asFile(csv, "perso.csv"), mapping);
    assert.strictEqual(result.headerRow, 2);
    // Quantité 2 : deux équipements (un numéro de série est propre à une unité, il est donc ignoré)
    assert.strictEqual(result.createdCount, 2);
  });
});
