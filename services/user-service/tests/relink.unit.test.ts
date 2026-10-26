import assert from "node:assert";
import { test, describe, before, beforeEach } from "node:test";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

type Credential = { id: string; email: string; role: string; isActive: boolean };

const ACCOUNT_ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let credentials: Credential[] = [];
let profiles: Record<string, any>[] = [];
let writes = 0;
let relinkProfiles: typeof import("../src/Services/relink.service")["relinkProfiles"];

before(async () => {
  const { authServiceClient } = await import("../src/clients/auth-service.client");
  authServiceClient.findByEmail = (async (email: string) =>
    credentials.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null) as any;
  const { userRepository } = await import("../src/Repositories/user.repository");
  userRepository.findAll = (async () => profiles.map((p) => ({ ...p }))) as any;
  userRepository.update = (async (id: string, data: Record<string, any>) => {
    if (data.authUserId && profiles.some((p) => p.id !== id && p.authUserId === data.authUserId)) {
      throw Object.assign(new Error("unique"), { code: "P2002" });
    }
    writes++;
    Object.assign(profiles.find((p) => p.id === id)!, data);
    return profiles.find((p) => p.id === id);
  }) as any;
  relinkProfiles = (await import("../src/Services/relink.service")).relinkProfiles;
});

beforeEach(() => {
  writes = 0;
  credentials = [
    { id: ACCOUNT_ALICE, email: "alice@exemple.fr", role: "RESPONSABLE", isActive: true },
    { id: ACCOUNT_BOB, email: "bob@exemple.fr", role: "EMPLOYE", isActive: false },
  ];
  profiles = [
    // identifiant aléatoire (fiche créée par l'ancien formulaire) mais un compte existe pour l'e-mail
    { id: "p1", email: "Alice@Exemple.fr", authUserId: "random-1", role: "EMPLOYE", isActive: true, status: "ACTIF" },
    // compte désactivé : la fiche active est alignée
    { id: "p2", email: "bob@exemple.fr", authUserId: "random-2", role: "EMPLOYE", isActive: true, status: "ACTIF" },
    // aucun compte pour cet e-mail
    { id: "p3", email: "sans-compte@exemple.fr", authUserId: "random-3", role: "AUDITEUR", isActive: true, status: "ACTIF" },
    // déjà non reliée, aucun compte
    { id: "p4", email: "libre@exemple.fr", authUserId: null, role: "EMPLOYE", isActive: true, status: "ACTIF" },
  ];
});

describe("reprise des fiches existantes", () => {
  test("relie par e-mail (casse ignorée), reprend rôle et état, retire les identifiants orphelins", async () => {
    const summary = await relinkProfiles();
    assert.deepStrictEqual(summary, { linked: 2, aligned: 0, cleared: 1, unchanged: 1, conflicts: [] });

    const [p1, p2, p3, p4] = profiles;
    assert.strictEqual(p1!.authUserId, ACCOUNT_ALICE);
    assert.strictEqual(p1!.role, "RESPONSABLE");
    assert.strictEqual(p2!.authUserId, ACCOUNT_BOB);
    assert.strictEqual(p2!.isActive, false);
    assert.strictEqual(p2!.status, "INACTIF");
    assert.ok(p2!.deactivatedAt instanceof Date);
    assert.strictEqual(p3!.authUserId, null);
    assert.strictEqual(p3!.role, "AUDITEUR", "la fiche sans compte est conservée telle quelle");
    assert.strictEqual(p4!.authUserId, null);
    assert.strictEqual(profiles.length, 4, "aucune fiche supprimée");
  });

  test("rejouée, la reprise ne modifie plus rien", async () => {
    await relinkProfiles();
    const before = writes;
    const summary = await relinkProfiles();
    assert.strictEqual(writes, before);
    assert.deepStrictEqual(summary, { linked: 0, aligned: 0, cleared: 0, unchanged: 4, conflicts: [] });
  });

  test("--dry-run n'écrit rien mais annonce les mêmes changements", async () => {
    const snapshot = JSON.stringify(profiles);
    const summary = await relinkProfiles({ dryRun: true });
    assert.strictEqual(writes, 0);
    assert.strictEqual(JSON.stringify(profiles), snapshot);
    assert.deepStrictEqual(summary, { linked: 2, aligned: 0, cleared: 1, unchanged: 1, conflicts: [] });
  });

  test("deux fiches pour le même compte : la seconde est signalée en conflit, rien n'est supprimé", async () => {
    profiles.push({ id: "p5", email: "ALICE@exemple.fr", authUserId: "random-5", role: "EMPLOYE", isActive: true, status: "ACTIF" });
    const summary = await relinkProfiles();
    assert.deepStrictEqual(summary.conflicts, ["ALICE@exemple.fr"]);
    assert.strictEqual(profiles.length, 5);
  });
});
