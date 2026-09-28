import assert from "node:assert";
import { test, describe } from "node:test";
import { ALL_PERMISSIONS, getPermissionsForRole } from "../src/config/permissions.config";

const ROLES = ["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"];

describe("Permissions par rôle (état temporaire : droits identiques)", () => {
  test("les quatre rôles reçoivent exactement la même liste de permissions", () => {
    for (const role of ROLES) {
      assert.deepStrictEqual([...getPermissionsForRole(role)].sort(), [...ALL_PERMISSIONS].sort(), role);
    }
  });

  test("un employé peut gérer postes, affectations, inventaires et audit", () => {
    const employe = getPermissionsForRole("EMPLOYE");
    for (const permission of [
      "assignment:create",
      "assignment:transfer",
      "assignment:return",
      "equipment:create",
      "inventory:create",
      "inventory:validate",
      "audit:read",
    ]) {
      assert.ok(employe.includes(permission), permission);
    }
  });

  test("modifier la liste d'un rôle ne modifie pas celle des autres", () => {
    getPermissionsForRole("EMPLOYE").push("test:only");
    assert.ok(!getPermissionsForRole("ADMIN").includes("test:only"));
    assert.ok(!ALL_PERMISSIONS.includes("test:only"));
    getPermissionsForRole("EMPLOYE").pop();
  });

  test("un rôle inconnu n'obtient aucune permission", () => {
    assert.deepStrictEqual(getPermissionsForRole("INCONNU"), []);
  });
});
