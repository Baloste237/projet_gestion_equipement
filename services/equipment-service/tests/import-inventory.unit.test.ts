import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test, describe } from "node:test";

import { readSpreadsheet, type SheetRow } from "../src/services/import-export/spreadsheet.reader";
import {
  buildEquipmentDrafts,
  makeHeaderMatcher,
  resolveColumnMapping,
  resolveNotesHeaders,
} from "../src/services/import-export/equipment-row.mapper";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name));
const csv = (text: string) => Buffer.from(text, "utf8");
const detect = { detectHeaderRow: true, isKnownHeader: makeHeaderMatcher() };

const readInventory = async () => {
  const sheet = await readSpreadsheet(fixture("import-inventory.csv"), "import-inventory.csv", detect);
  const mapping = resolveColumnMapping(sheet.headers);
  const built = buildEquipmentDrafts(sheet.rows, mapping, resolveNotesHeaders(sheet.headers));
  return { sheet, mapping, ...built };
};

describe("Lecture d'un fichier d'inventaire : en-tête et lignes ignorées", () => {
  test("détecte l'en-tête en ligne 5 sous un titre et des lignes vides", async () => {
    const { sheet, mapping } = await readInventory();
    assert.strictEqual(sheet.headerRow, 5);
    assert.strictEqual(sheet.headers[0], "IDENTIFIANT");
    assert.strictEqual(mapping.category, "CATEGORIE");
    assert.strictEqual(mapping.quantity, "QUANTITE");
    assert.strictEqual(mapping.condition, "ETAT");
  });

  test("garde les numéros de ligne du fichier, même avec une cellule multi-ligne", async () => {
    const { sheet } = await readInventory();
    assert.deepStrictEqual(sheet.rows.map((r) => r.rowNumber), [6, 7, 8, 10]);
  });

  test("ignore et compte les lignes vides ou réduites à « () », et s'arrête à la liste de valeurs", async () => {
    const { sheet } = await readInventory();
    // lignes 9 (vide) et 11 à 13 (« () ») ; la liste de valeurs (ligne 14 et suivantes) n'est pas lue
    assert.strictEqual(sheet.ignoredRowCount, 4);
    assert.ok(!sheet.rows.some((r) => JSON.stringify(r.values).includes("AGRAFEUSE")));
  });

  test("l'arrêt à « LISTE DES VALEURS » ignore la casse", async () => {
    const sheet = await readSpreadsheet(csv("Nom;Marque\nA;X\nListe Des Valeurs du tableau;\nB;Y\n"), "t.csv", detect);
    assert.deepStrictEqual(sheet.rows.map((r) => r.values.Nom), ["A"]);
  });

  test("un fichier dont l'en-tête est en ligne 1 est lu comme avant", async () => {
    const sheet = await readSpreadsheet(fixture("import-sample.csv"), "import-sample.csv", detect);
    assert.strictEqual(sheet.headerRow, 1);
    assert.strictEqual(sheet.rows.length, 3);
    assert.strictEqual(sheet.ignoredRowCount, 0);
  });

  test("sans colonne reconnue, la première ligne non vide sert d'en-tête", async () => {
    const sheet = await readSpreadsheet(csv(";;\nxx;yy\n1;2\n"), "t.csv", detect);
    assert.strictEqual(sheet.headerRow, 2);
    assert.deepStrictEqual(sheet.headers, ["xx", "yy"]);
  });

  test("le mapping personnalisé compte pour repérer l'en-tête", async () => {
    const matcher = makeHeaderMatcher({ "Réf interne": "serialNumber", Désignation: "name" });
    const sheet = await readSpreadsheet(csv("Titre;;\nRéf interne;Désignation\nA1;Chaise\n"), "t.csv", {
      detectHeaderRow: true,
      isKnownHeader: matcher,
    });
    assert.strictEqual(sheet.headerRow, 2);
  });

  test("le séparateur se déduit des premières lignes : un titre sans « ; » ne fait pas choisir la virgule", async () => {
    const sheet = await readSpreadsheet(csv("TITRE SANS SEPARATEUR\n\nNom;Marque\nChaise;X\n"), "t.csv", detect);
    assert.strictEqual(sheet.headerRow, 3);
    assert.deepStrictEqual(sheet.headers, ["Nom", "Marque"]);
  });

  test("sans option, la ligne 1 reste l'en-tête (import des catégories inchangé)", async () => {
    const sheet = await readSpreadsheet(fixture("import-inventory.csv"), "import-inventory.csv");
    assert.strictEqual(sheet.headerRow, 1);
    assert.strictEqual(sheet.ignoredRowCount, 0);
  });
});

describe("Équipements générés depuis le fichier d'inventaire", () => {
  test("produit 6 équipements sans erreur (quantité 3 comprise), tous à compléter", async () => {
    const { drafts, errors } = await readInventory();
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(drafts.length, 6);
    assert.ok(drafts.every((d) => d.status === "A_COMPLETER" && d.serialNumber.startsWith("TMP-")));
  });

  test("nom de repli : marque et modèle, marque seule, ou catégorie pour le mobilier", async () => {
    const { drafts } = await readInventory();
    assert.deepStrictEqual(
      [...new Set(drafts.map((d) => d.name))],
      ["LG HS-C1865SA4", "HP", "CHAISE", "ARMOIRE"]
    );
  });

  test("le montant est un prix unitaire porté par chaque équipement de la ligne", async () => {
    const { drafts } = await readInventory();
    const chairs = drafts.filter((d) => d.name === "CHAISE");
    assert.strictEqual(chairs.length, 3);
    assert.ok(chairs.every((d) => d.purchasePrice === 19500));
    assert.strictEqual(drafts.find((d) => d.name === "ARMOIRE")!.purchasePrice, 81250);
  });

  test("retire les parenthèses du code-barres", async () => {
    const { drafts } = await readInventory();
    assert.deepStrictEqual(
      [...new Set(drafts.map((d) => d.barcode))],
      ["Equ-Cli-001", "Inf-Cla-001", "Mob-Cha-002", "Mob-Arm-001"]
    );
  });

  test("réunit caractéristiques et observations dans les notes", async () => {
    const { drafts } = await readInventory();
    assert.strictEqual(drafts.find((d) => d.name === "HP")!.notes, "CLAVIER USB | RECENT");
    assert.strictEqual(drafts.find((d) => d.name === "CHAISE")!.notes, "CHAISE EN TISSU ROUGE");
    assert.strictEqual(drafts.find((d) => d.name === "ARMOIRE")!.notes, "DIMENSION (198X120X45 CM)\nARMOIRE METALLIQUE");
  });

  test("lit « DATE D'ACQUISITION » comme date d'achat et l'état NON-FONCTIONNEL", async () => {
    const { drafts, mapping } = await readInventory();
    assert.strictEqual(mapping.purchaseDate, "DATE D'ACQUISITION");
    assert.strictEqual(drafts.find((d) => d.name === "ARMOIRE")!.purchaseDate?.toISOString().slice(0, 10), "2009-01-09");
    assert.strictEqual(drafts.find((d) => d.name === "LG HS-C1865SA4")!.condition, "NON_FONCTIONNEL");
  });

  test("« IDENTIFIANT » n'est associé à aucun champ", async () => {
    const { mapping } = await readInventory();
    assert.ok(!Object.values(mapping).includes("IDENTIFIANT"));
  });
});

describe("Montants, notes et noms (règles du mapper)", () => {
  const priceOf = (text: string) => {
    const { drafts, errors } = buildEquipmentDrafts([{ rowNumber: 2, values: { Nom: "X", Prix: text } }], {
      name: "Nom",
      purchasePrice: "Prix",
    });
    return { price: drafts[0]?.purchasePrice, errors: errors.map((e) => e.message) };
  };

  test("monnaie explicite : « . », « , » ou espace sont des séparateurs de milliers", () => {
    assert.strictEqual(priceOf("19.500 F").price, 19500);
    assert.strictEqual(priceOf("81.250 F").price, 81250);
    assert.strictEqual(priceOf("1 250 000 FCFA").price, 1250000);
    assert.strictEqual(priceOf("12,500 xaf").price, 12500);
    assert.strictEqual(priceOf("500 F").price, 500);
  });

  test("monnaie explicite : un vrai décimal reste décimal", () => {
    assert.strictEqual(priceOf("19,50 F").price, 19.5);
  });

  test("sans monnaie, la lecture est inchangée", () => {
    assert.strictEqual(priceOf("19.5").price, 19.5);
    assert.strictEqual(priceOf("1 249,90").price, 1249.9);
    assert.strictEqual(priceOf("189").price, 189);
  });

  test("un montant illisible est refusé (« Prix invalide »)", () => {
    assert.deepStrictEqual(priceOf("sur devis").errors, ["Prix invalide"]);
    assert.deepStrictEqual(priceOf("F").errors, ["Prix invalide"]);
  });

  test("notes : deux colonnes, une seule, ou aucune", () => {
    const row = (values: Record<string, string | null>) => ({ rowNumber: 2, values: { Nom: "X", ...values } });
    const both = buildEquipmentDrafts([row({ A: "a", B: "b" })], { name: "Nom" }, ["A", "B"]).drafts[0];
    const onlyB = buildEquipmentDrafts([row({ A: null, B: "b" })], { name: "Nom" }, ["A", "B"]).drafts[0];
    const none = buildEquipmentDrafts([row({ A: null, B: null })], { name: "Nom" }, ["A", "B"]).drafts[0];
    assert.strictEqual(both.notes, "a | b");
    assert.strictEqual(onlyB.notes, "b");
    assert.strictEqual(none.notes, null);
  });

  test("resolveNotesHeaders : toutes les colonnes de notes, dans l'ordre du fichier", () => {
    assert.deepStrictEqual(
      resolveNotesHeaders(["MARQUE", "CARACTERISTIQUES", "OBSERVATIONS / HISTORIQUE"]),
      ["CARACTERISTIQUES", "OBSERVATIONS / HISTORIQUE"]
    );
    assert.deepStrictEqual(resolveNotesHeaders(["Nom", "Marque"]), []);
  });

  test("les autres champs gardent un seul en-tête", () => {
    assert.strictEqual(resolveColumnMapping(["CARACTERISTIQUES", "OBSERVATIONS / HISTORIQUE"]).notes, "CARACTERISTIQUES");
  });

  test("nom de repli : la catégorie ; sans catégorie, « Nom manquant »", () => {
    const rows: { rowNumber: number; values: SheetRow }[] = [
      { rowNumber: 2, values: { Categorie: "CHAISE", Quantite: null } },
      { rowNumber: 3, values: { Categorie: null, Quantite: "1" } },
    ];
    const { drafts, errors } = buildEquipmentDrafts(rows, { category: "Categorie", quantity: "Quantite" });
    assert.strictEqual(drafts.length, 1);
    assert.strictEqual(drafts[0].name, "CHAISE");
    assert.deepStrictEqual(errors.map((e) => e.row), [3]);
    assert.match(errors[0].message, /^Nom manquant/);
  });

  test("code-barres : « () » vaut vide, un code sans parenthèses est inchangé", () => {
    const barcodeOf = (text: string) =>
      buildEquipmentDrafts([{ rowNumber: 2, values: { Nom: "X", Code: text } }], { name: "Nom", barcode: "Code" })
        .drafts[0].barcode;
    assert.strictEqual(barcodeOf("(Inf-Cla-001)"), "Inf-Cla-001");
    assert.strictEqual(barcodeOf("()"), null);
    assert.strictEqual(barcodeOf("3700000000011"), "3700000000011");
  });
});
