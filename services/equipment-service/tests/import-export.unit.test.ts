import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test, describe } from "node:test";
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
