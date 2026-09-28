import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "secret-de-test";

let server: http.Server;
let base: string;
let rebuildCalls = 0;

const tokenFor = (role: string) => jwt.sign({ id: `user-${role}`, role, permissions: [] }, process.env.JWT_SECRET!);

const rebuild = (token?: string) =>
  fetch(`${base}/api/dashboard/kpis/rebuild`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

before(async () => {
  const { kpiSyncService } = await import("../src/services/kpi-sync.service");
  // Pas de base ni de services distants : la reconstruction est simulée
  kpiSyncService.rebuild = (async () => {
    rebuildCalls++;
    return { equipmentCount: 3, activeAssignmentCount: 1 };
  }) as any;

  const app = (await import("../src/app")).default;
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

describe("Reconstruction des KPIs : accessible à tout utilisateur authentifié", () => {
  for (const role of ["ADMIN", "RESPONSABLE", "EMPLOYE", "AUDITEUR"]) {
    test(`le rôle ${role} peut lancer la reconstruction`, async () => {
      const before = rebuildCalls;
      const response = await rebuild(tokenFor(role));
      assert.strictEqual(response.status, 200);
      assert.strictEqual(rebuildCalls, before + 1);
    });
  }

  test("un appel sans jeton est refusé (401) et ne déclenche rien", async () => {
    const before = rebuildCalls;
    const response = await rebuild();
    assert.strictEqual(response.status, 401);
    assert.strictEqual(rebuildCalls, before);
  });

  test("un jeton invalide est refusé (401)", async () => {
    const response = await rebuild("pas-un-jeton");
    assert.strictEqual(response.status, 401);
  });
});
