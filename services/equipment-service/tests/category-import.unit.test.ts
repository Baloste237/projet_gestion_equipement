import assert from "node:assert";
import { test, describe, beforeEach } from "node:test";
import { categoryRepository } from "../src/repositories/category.repository";
import { buildCategoryDrafts, categoryImportService } from "../src/services/import-export/category-import.service";

const csv = (text: string) => ({ buffer: Buffer.from(text, "utf8"), originalname: "categories.csv" });
const rows = (...names: (string | null)[]) =>
  names.map((name, i) => ({ rowNumber: i + 2, values: { NOM: name, DESCRIPTION: null } }));

describe("buildCategoryDrafts", () => {
  test("reconnaît la colonne du nom sous plusieurs en-têtes, sans tenir compte de la casse ni des accents", () => {
    for (const header of ["NOM", "Catégorie", "category", "Name", "libellé"]) {
      const result = buildCategoryDrafts([header], [{ rowNumber: 2, values: { [header]: "Laptop" } }]);
      assert.strictEqual(result.nameColumnFound, true, header);
      assert.deepStrictEqual(result.drafts, [{ name: "Laptop", description: null }]);
    }
  });

  test("signale l'absence de colonne de nom", () => {
    assert.strictEqual(buildCategoryDrafts(["MARQUE"], []).nameColumnFound, false);
  });

  test("lit la description et nettoie les espaces", () => {
    const result = buildCategoryDrafts(["NOM", "DESCRIPTION"], [
      { rowNumber: 2, values: { NOM: "  Laptop ", DESCRIPTION: " Portables " } },
    ]);
    assert.deepStrictEqual(result.drafts, [{ name: "Laptop", description: "Portables" }]);
  });

  test("fusionne les noms qui ne diffèrent que par la casse : la première ligne l'emporte", () => {
    const result = buildCategoryDrafts(["NOM", "DESCRIPTION"], [
      { rowNumber: 2, values: { NOM: "Laptop", DESCRIPTION: "Première" } },
      { rowNumber: 3, values: { NOM: "LAPTOP", DESCRIPTION: "Seconde" } },
    ]);
    assert.deepStrictEqual(result.drafts, [{ name: "Laptop", description: "Première" }]);
    assert.strictEqual(result.duplicateInFileCount, 1);
    assert.strictEqual(result.errors.length, 0);
  });

  test("signale un nom vide, trop court ou trop long avec le numéro de ligne", () => {
    const result = buildCategoryDrafts(["NOM"], [
      { rowNumber: 2, values: { NOM: null } },
      { rowNumber: 3, values: { NOM: "A" } },
      { rowNumber: 4, values: { NOM: "x".repeat(101) } },
      { rowNumber: 5, values: { NOM: "Écran" } },
    ]);
    assert.deepStrictEqual(result.errors.map((e) => e.row), [2, 3, 4]);
    assert.deepStrictEqual(result.drafts.map((d) => d.name), ["Écran"]);
  });

  test("refuse une description de plus de 500 caractères", () => {
    const result = buildCategoryDrafts(["NOM", "DESCRIPTION"], [
      { rowNumber: 2, values: { NOM: "Laptop", DESCRIPTION: "x".repeat(501) } },
    ]);
    assert.strictEqual(result.errors.length, 1);
  });

  test("refuse un fichier de plus de 1 000 lignes", () => {
    const many = Array.from({ length: 1001 }, (_, i) => ({ rowNumber: i + 2, values: { NOM: `Catégorie ${i}` } }));
    const result = buildCategoryDrafts(["NOM"], many);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.drafts.length, 0);
  });
});

// Dépôt remplacé : les catégories « déjà en base » sont fixées par chaque test
let stored: { id: string; name: string }[];
let inserted: { name: string; description: string | null }[];

beforeEach(() => {
  stored = [{ id: "c1", name: "Laptop" }];
  inserted = [];
  Object.assign(categoryRepository, {
    findAllNames: async () => stored,
    createMany: async (data: { name: string; description: string | null }[]) => {
      inserted.push(...data);
      return { count: data.length };
    },
  });
});

describe("categoryImportService", () => {
  test("crée les catégories nouvelles avec leur description", async () => {
    const result = await categoryImportService.import(csv("NOM;DESCRIPTION\nÉcran;Moniteurs\nSouris;\n"));
    assert.deepStrictEqual(inserted, [
      { name: "Écran", description: "Moniteurs" },
      { name: "Souris", description: null },
    ]);
    assert.deepStrictEqual(
      [result.rowCount, result.createdCount, result.existingCount, result.duplicateInFileCount],
      [2, 2, 0, 0]
    );
  });

  test("une catégorie déjà existante reste inchangée et est comptée comme existante (casse ignorée)", async () => {
    const result = await categoryImportService.import(csv("NOM;DESCRIPTION\nLAPTOP;Autre description\nÉcran;Moniteurs\n"));
    assert.deepStrictEqual(inserted, [{ name: "Écran", description: "Moniteurs" }]);
    assert.strictEqual(result.createdCount, 1);
    assert.strictEqual(result.existingCount, 1);
    assert.deepStrictEqual(result.existingNames, ["Laptop"]);
  });

  test("relancer le même import ne crée rien : tout est « déjà existant »", async () => {
    stored = [{ id: "c1", name: "Laptop" }, { id: "c2", name: "Écran" }];
    const result = await categoryImportService.import(csv("NOM\nLaptop\nÉcran\n"));
    assert.deepStrictEqual(inserted, []);
    assert.deepStrictEqual([result.createdCount, result.existingCount], [0, 2]);
  });

  test("compte les doublons du fichier ignorés", async () => {
    const result = await categoryImportService.import(csv("NOM\nÉcran\nécran\n"));
    assert.strictEqual(result.createdCount, 1);
    assert.strictEqual(result.duplicateInFileCount, 1);
  });

  test("une ligne invalide fait refuser tout l'import : rien n'est créé", async () => {
    await assert.rejects(categoryImportService.import(csv("NOM\nÉcran\nA\n")), (err: any) => {
      assert.strictEqual(err.statusCode, 400);
      assert.deepStrictEqual(err.details.map((d: any) => d.row), [3]);
      return true;
    });
    assert.deepStrictEqual(inserted, []);
  });

  test("un fichier sans colonne de nom est refusé en nommant les en-têtes attendus", async () => {
    await assert.rejects(categoryImportService.import(csv("MARQUE;MODELE\nHP;X\n")), (err: any) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /NOM, CATEGORIE, CATEGORY, NAME, LIBELLE/);
      return true;
    });
  });

  test("un fichier sans ligne de données est refusé", async () => {
    await assert.rejects(categoryImportService.import(csv("NOM;DESCRIPTION\n")), (err: any) => err.statusCode === 400);
  });
});
