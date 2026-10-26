import assert from "node:assert";
import { test, describe, beforeEach } from "node:test";
import { createCategorySchema, updateCategorySchema } from "../src/validators/category.validator";
import { categoryRepository } from "../src/repositories/category.repository";
import { categoryService } from "../src/services/category.service";

describe("Validation des catégories", () => {
  test("refuse un nom d'un seul caractère, même entouré d'espaces", () => {
    assert.strictEqual(createCategorySchema.safeParse({ name: "A" }).success, false);
    assert.strictEqual(createCategorySchema.safeParse({ name: "  A  " }).success, false);
  });

  test("retire les espaces autour du nom et de la description", () => {
    const parsed = createCategorySchema.parse({ name: "  Laptop  ", description: " Portables " });
    assert.deepStrictEqual(parsed, { name: "Laptop", description: "Portables" });
  });

  test("refuse un nom de plus de 100 caractères et une description de plus de 500", () => {
    assert.strictEqual(createCategorySchema.safeParse({ name: "x".repeat(101) }).success, false);
    assert.strictEqual(createCategorySchema.safeParse({ name: "Laptop", description: "x".repeat(501) }).success, false);
  });

  test("la modification accepte des champs partiels", () => {
    assert.strictEqual(updateCategorySchema.safeParse({ description: "Nouvelle" }).success, true);
    assert.strictEqual(updateCategorySchema.safeParse({}).success, true);
  });
});

// Dépôt remplacé par une petite base en mémoire : le service est testé sans PostgreSQL
type Row = { id: string; name: string; description: string | null; equipments: number };
let rows: Row[];
let created: { name: string; description: string | null }[];
let deletedIds: string[];
let failNextWith: { method: "create" | "update" | "delete"; code: string } | null;

const view = (row: Row) => ({ id: row.id, name: row.name, description: row.description, _count: { equipments: row.equipments } });

beforeEach(() => {
  rows = [
    { id: "c1", name: "Laptop", description: "Portables", equipments: 3 },
    { id: "c2", name: "Souris", description: null, equipments: 0 },
  ];
  created = [];
  deletedIds = [];
  failNextWith = null;
  const fail = (method: "create" | "update" | "delete") => {
    if (failNextWith?.method === method) {
      const code = failNextWith.code;
      failNextWith = null;
      throw Object.assign(new Error("prisma"), { code });
    }
  };
  Object.assign(categoryRepository, {
    findAll: async () => rows.map(view),
    findById: async (id: string) => rows.filter((r) => r.id === id).map(view)[0] ?? null,
    findByName: async (name: string, excludeId?: string) =>
      rows.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== excludeId) ?? null,
    countEquipments: async (id: string) => rows.find((r) => r.id === id)?.equipments ?? 0,
    create: async (data: { name: string; description?: string | null }) => {
      fail("create");
      created.push({ name: data.name, description: data.description ?? null });
      return view({ id: "new", name: data.name, description: data.description ?? null, equipments: 0 });
    },
    update: async (id: string, data: { name?: string; description?: string | null }) => {
      fail("update");
      const row = rows.find((r) => r.id === id)!;
      Object.assign(row, data);
      return view(row);
    },
    delete: async (id: string) => {
      fail("delete");
      deletedIds.push(id);
    },
  });
});

const rejects = async (promise: Promise<unknown>, statusCode: number) => {
  await assert.rejects(promise, (err: any) => {
    assert.strictEqual(err.statusCode, statusCode, `statusCode attendu ${statusCode}, reçu ${err.statusCode}`);
    return true;
  });
};

describe("Liste et lecture", () => {
  test("la liste contient le nombre d'équipements de chaque catégorie", async () => {
    const list = await categoryService.getAll();
    assert.deepStrictEqual(
      list.map((c) => [c.name, c.equipmentCount]),
      [["Laptop", 3], ["Souris", 0]]
    );
    assert.strictEqual("_count" in list[0], false);
  });

  test("une catégorie introuvable renvoie 404", async () => {
    await rejects(categoryService.getById("inconnu"), 404);
  });
});

describe("Unicité du nom", () => {
  test("refuse « LAPTOP » si « Laptop » existe (409)", async () => {
    await rejects(categoryService.create({ name: "LAPTOP" }), 409);
    assert.deepStrictEqual(created, []);
  });

  test("crée une catégorie au nom nouveau, avec le nom nettoyé", async () => {
    const category = await categoryService.create({ name: "  Écran  ", description: "  " });
    assert.deepStrictEqual(created, [{ name: "Écran", description: null }]);
    assert.strictEqual(category.equipmentCount, 0);
  });

  test("refuse le renommage vers le nom d'une autre catégorie (409), le nom d'origine est conservé", async () => {
    await rejects(categoryService.update("c2", { name: "laptop" }), 409);
    assert.strictEqual(rows[1].name, "Souris");
  });

  test("garder son propre nom en changeant la description est accepté", async () => {
    const updated = await categoryService.update("c1", { name: "Laptop", description: "Nouvelle" });
    assert.strictEqual(updated.description, "Nouvelle");
  });

  test("une violation d'unicité de la base (création simultanée) devient un 409", async () => {
    failNextWith = { method: "create", code: "P2002" };
    await rejects(categoryService.create({ name: "Clavier" }), 409);
  });

  test("modifier une catégorie inconnue renvoie 404", async () => {
    await rejects(categoryService.update("inconnu", { description: "x" }), 404);
  });
});

describe("Suppression", () => {
  test("refuse de supprimer une catégorie utilisée (409) en indiquant le nombre d'équipements", async () => {
    await assert.rejects(categoryService.delete("c1"), (err: any) => {
      assert.strictEqual(err.statusCode, 409);
      assert.deepStrictEqual(err.details, { equipmentCount: 3 });
      assert.match(err.message, /3 équipements/);
      return true;
    });
    assert.deepStrictEqual(deletedIds, []);
  });

  test("supprime une catégorie sans équipement", async () => {
    await categoryService.delete("c2");
    assert.deepStrictEqual(deletedIds, ["c2"]);
  });

  test("un équipement rattaché pendant la suppression (clé étrangère) devient un 409", async () => {
    failNextWith = { method: "delete", code: "P2003" };
    await rejects(categoryService.delete("c2"), 409);
  });

  test("supprimer une catégorie inconnue renvoie 404", async () => {
    await rejects(categoryService.delete("inconnu"), 404);
  });
});
