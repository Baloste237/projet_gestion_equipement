import assert from "node:assert";
import { test, describe } from "node:test";
import { requireRole } from "../src/middlewares/security";

const run = (user: { role: string } | undefined, ...roles: string[]) => {
  let outcome: unknown = "non appelé";
  requireRole(...roles)({ user } as any, {} as any, (err?: unknown) => { outcome = err ?? "suite"; });
  return outcome as any;
};

describe("requireRole", () => {
  test("laisse passer un rôle autorisé", () => {
    assert.strictEqual(run({ role: "ADMIN" }, "ADMIN"), "suite");
  });

  test("refuse (403) un rôle non autorisé", () => {
    const err = run({ role: "EMPLOYE" }, "ADMIN");
    assert.strictEqual(err.statusCode, 403);
  });

  test("refuse (401) l'absence d'utilisateur authentifié", () => {
    const err = run(undefined, "ADMIN");
    assert.strictEqual(err.statusCode, 401);
  });
});
