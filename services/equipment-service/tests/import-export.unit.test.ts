import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test, describe, before } from "node:test";
import ExcelJS from "exceljs";
import { readSpreadsheet } from "../src/services/import-export/spreadsheet.reader";
import { buildEquipmentDrafts, resolveColumnMapping } from "../src/services/import-export/equipment-row.mapper";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name));

describe("Lecture et mapping du fichier d'import", () => {
  test("reconnaît les en-têtes français d'un CSV séparé par « ; »", async () => {
    const { headers, rows } = await readSpreadsheet(fixture("import-sample.csv"), "import-sample.csv");
    const mapping = resolveColumnMapping(headers);
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(mapping.serialNumber, "N° de série");
    assert.strictEqual(mapping.quantity, "Quantité");
    assert.strictEqual(mapping.location, "Emplacement");
  });

  test("le mapping personnalisé prime sur le mapping par défaut", () => {
    const mapping = resolveColumnMapping(["Nom", "Réf. constructeur"], { "réf constructeur": "serialNumber" });
    assert.deepStrictEqual(mapping, { name: "Nom", serialNumber: "Réf. constructeur" });
  });
});

describe("Génération unitaire des équipements", () => {
  test("une ligne de quantité N produit N équipements A_COMPLETER avec numéros temporaires", async () => {
    const { headers, rows } = await readSpreadsheet(fixture("import-sample.csv"), "import-sample.csv");
    const { drafts, errors } = buildEquipmentDrafts(rows, resolveColumnMapping(headers));

    assert.deepStrictEqual(errors, []);
    assert.strictEqual(drafts.length, 5);

    const [laptop, ...others] = drafts;
    assert.strictEqual(laptop.serialNumber, "SN-IMPORT-0001");
    assert.strictEqual(laptop.status, "AVAILABLE");
    assert.strictEqual(laptop.purchasePrice, 1249.9);
    assert.strictEqual(laptop.purchaseDate?.toISOString().slice(0, 10), "2026-03-15");

    const screens = others.filter((d) => d.name === "Écran 24 pouces");
    assert.strictEqual(screens.length, 3);
    assert.ok(screens.every((d) => d.status === "A_COMPLETER" && d.serialNumber.startsWith("TMP-")));
    assert.strictEqual(new Set(screens.map((d) => d.serialNumber)).size, 3);

    // Sans nom ni catégorie : nom déduit de la marque/modèle, catégorie par défaut
    const keyboard = others.find((d) => d.brand === "Logitech")!;
    assert.strictEqual(keyboard.name, "Logitech MX Keys");
    assert.strictEqual(keyboard.categoryName, "Non classé");
  });

  test("signale les lignes invalides sans générer d'équipement", async () => {
    const { headers, rows } = await readSpreadsheet(fixture("import-invalid.csv"), "import-invalid.csv");
    const { errors } = buildEquipmentDrafts(rows, resolveColumnMapping(headers));
    assert.deepStrictEqual(errors.map((e) => e.row), [3, 4]);
  });

  test("refuse un numéro de série en double dans le fichier", () => {
    const rows = [
      { rowNumber: 2, values: { Nom: "A", SN: "X-1" } },
      { rowNumber: 3, values: { Nom: "B", SN: "X-1" } },
    ];
    const { errors } = buildEquipmentDrafts(rows, { name: "Nom", serialNumber: "SN" });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].row, 3);
  });
});

describe("Aperçu de l'import (sans création)", () => {
  let previewService: typeof import("../src/services/import-export/equipment-import.service")["equipmentImportService"];
  let prismaClient: typeof import("../src/config/prisma")["prisma"];
  let writes = 0;

  const asFile = (buffer: Buffer, originalname: string) => ({ buffer, originalname });

  before(async () => {
    previewService = (await import("../src/services/import-export/equipment-import.service")).equipmentImportService;
    prismaClient = (await import("../src/config/prisma")).prisma;
    // Toute tentative d'écriture pendant un aperçu ferait échouer les tests
    (prismaClient as any).$transaction = async () => {
      writes++;
      throw new Error("écriture interdite pendant un aperçu");
    };
  });

  test("CSV séparé par « ; » : en-têtes, nombre de lignes, échantillon et mapping reconnu", async () => {
    const preview = await previewService.preview(asFile(fixture("import-sample.csv"), "import-sample.csv"));
    assert.strictEqual(preview.rowCount, 3);
    assert.ok(preview.headers.includes("N° de série"));
    assert.strictEqual(preview.sampleRows[0].values["Nom"], "Portable Dell");
    assert.strictEqual(preview.suggestedMapping["N° de série"], "serialNumber");
    assert.strictEqual(preview.suggestedMapping["Quantité"], "quantity");
    assert.ok(preview.fields.includes("serialNumber"));
    assert.strictEqual(writes, 0);
  });

  test("CSV séparé par « , » : les colonnes inconnues n'ont pas de suggestion", async () => {
    const csv = Buffer.from("Nom,Réf. constructeur,Site\nPortable,RC-1,Paris\n", "utf8");
    const preview = await previewService.preview(asFile(csv, "sample.csv"));
    assert.deepStrictEqual(preview.headers, ["Nom", "Réf. constructeur", "Site"]);
    assert.deepStrictEqual(preview.suggestedMapping, { Nom: "name" });
  });

  test("le mapping suggéré est directement réutilisable comme mapping d'import", async () => {
    const preview = await previewService.preview(asFile(fixture("import-sample.csv"), "import-sample.csv"));
    const headers = preview.headers;
    const mapping = resolveColumnMapping(headers, preview.suggestedMapping as any);
    for (const [header, field] of Object.entries(preview.suggestedMapping)) {
      assert.strictEqual(mapping[field as keyof typeof mapping], header);
    }
  });

  test("classeur .xlsx : lit la première feuille", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Parc");
    sheet.addRow(["Désignation", "SN", "Marque"]);
    sheet.addRow(["Écran", "SN-XLSX-1", "Dell"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const preview = await previewService.preview(asFile(buffer, "parc.xlsx"));
    assert.strictEqual(preview.rowCount, 1);
    assert.deepStrictEqual(preview.suggestedMapping, { Désignation: "name", SN: "serialNumber", Marque: "brand" });
  });

  test("le nombre de lignes d'échantillon est limité", async () => {
    const lines = Array.from({ length: 12 }, (_, i) => `Portable ${i}`).join("\n");
    const preview = await previewService.preview(asFile(Buffer.from(`Nom\n${lines}\n`), "many.csv"));
    assert.strictEqual(preview.rowCount, 12);
    assert.strictEqual(preview.sampleRows.length, 5);
  });

  test("fichier sans ligne de données ou illisible : erreur 400", async () => {
    await assert.rejects(previewService.preview(asFile(Buffer.from("Nom;Marque\n"), "vide.csv")), { statusCode: 400 });
    await assert.rejects(previewService.preview(asFile(Buffer.from("pas un classeur"), "faux.xlsx")), { statusCode: 400 });
  });

  test("POST /api/equipments/import/preview : réponse 200 en multipart, 400 sans fichier, aucune écriture", async () => {
    const app = (await import("../src/app")).default;
    const server = await new Promise<import("node:http").Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    try {
      const { port } = server.address() as import("node:net").AddressInfo;
      const url = `http://127.0.0.1:${port}/api/equipments/import/preview`;

      const form = new FormData();
      form.append("file", new Blob([fixture("import-sample.csv")], { type: "text/csv" }), "import-sample.csv");
      const ok = await fetch(url, { method: "POST", body: form });
      const body = (await ok.json()) as any;
      assert.strictEqual(ok.status, 200);
      assert.strictEqual(body.data.rowCount, 3);

      const missing = await fetch(url, { method: "POST", body: new FormData() });
      assert.strictEqual(missing.status, 400);

      const wrongType = new FormData();
      wrongType.append("file", new Blob(["x"], { type: "text/plain" }), "notes.txt");
      assert.notStrictEqual((await fetch(url, { method: "POST", body: wrongType })).status, 200);
      assert.strictEqual(writes, 0);
    } finally {
      server.close();
    }
  });
});
