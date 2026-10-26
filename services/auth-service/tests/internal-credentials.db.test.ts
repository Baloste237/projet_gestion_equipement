import assert from "node:assert";
import { test, describe, before, after, beforeEach } from "node:test";

// Test d'intégration sur un vrai PostgreSQL : ignoré sans TEST_DATABASE_URL (base jetable, migrations appliquées)
const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
process.env.JWT_SECRET = "test-secret";

describe("auth-service : comptes en base (rôle, désactivation, dernier administrateur)", { skip: !url }, () => {
  let prisma: typeof import("../src/config/prisma")["prisma"];
  let admin: typeof import("../src/services/credential-admin.service")["credentialAdminService"];
  let auth: typeof import("../src/services/auth.service")["authService"];
  let publisher: typeof import("../src/clients/audit-publisher.client")["auditPublisher"];

  before(async () => {
    prisma = (await import("../src/config/prisma")).prisma;
    admin = (await import("../src/services/credential-admin.service")).credentialAdminService;
    auth = (await import("../src/services/auth.service")).authService;
    publisher = (await import("../src/clients/audit-publisher.client")).auditPublisher;
    publisher.publish = (async () => {}) as any;
  });
  after(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.credential.deleteMany();
  });

  const PASSWORD = "MotDePasse-Correct-1";
  const make = async (email: string, role = "EMPLOYE") => {
    const created = await auth.register({ email, password: PASSWORD });
    if (role !== "EMPLOYE") await prisma.credential.update({ where: { id: created.id }, data: { role } });
    return created.id;
  };

  test("un rôle modifié est repris au login suivant et au rafraîchissement suivant", async () => {
    const id = await make("alice@exemple.fr");
    const first = await auth.login({ email: "alice@exemple.fr", password: PASSWORD });
    await admin.update(id, { role: "RESPONSABLE" });
    const second = await auth.login({ email: "alice@exemple.fr", password: PASSWORD });
    assert.strictEqual(second.user.role, "RESPONSABLE");
    const refreshed = await auth.refresh(first.refreshToken);
    const payload = JSON.parse(Buffer.from(refreshed.accessToken.split(".")[1]!, "base64url").toString());
    assert.strictEqual(payload.role, "RESPONSABLE");
  });

  test("la désactivation coupe le rafraîchissement et le login (même réponse que mot de passe faux)", async () => {
    const id = await make("bob@exemple.fr");
    const session = await auth.login({ email: "bob@exemple.fr", password: PASSWORD });
    await admin.update(id, { isActive: false });
    await assert.rejects(auth.refresh(session.refreshToken), { code: "INVALID_REFRESH_TOKEN" });
    await assert.rejects(auth.login({ email: "bob@exemple.fr", password: PASSWORD }), { code: "INVALID_CREDENTIALS", statusCode: 401 });
    await admin.update(id, { isActive: true });
    assert.ok((await auth.login({ email: "bob@exemple.fr", password: PASSWORD })).accessToken);
  });

  test("le seul administrateur ne peut être ni rétrogradé ni désactivé (409)", async () => {
    const id = await make("root@exemple.fr", "ADMIN");
    await assert.rejects(admin.update(id, { role: "EMPLOYE" }), { code: "LAST_ADMIN", statusCode: 409 });
    await assert.rejects(admin.update(id, { isActive: false }), { code: "LAST_ADMIN" });
    assert.strictEqual((await prisma.credential.findUnique({ where: { id } }))!.role, "ADMIN");
  });

  test("avec deux administrateurs, une rétrogradation est acceptée", async () => {
    const a = await make("a@exemple.fr", "ADMIN");
    await make("b@exemple.fr", "ADMIN");
    const result = await admin.update(a, { role: "EMPLOYE" });
    assert.strictEqual(result.role, "EMPLOYE");
  });

  test("deux rétrogradations simultanées ne laissent jamais zéro administrateur", async () => {
    for (let round = 0; round < 5; round++) {
      await prisma.refreshToken.deleteMany();
      await prisma.credential.deleteMany();
      const a = await make(`a${round}@exemple.fr`, "ADMIN");
      const b = await make(`b${round}@exemple.fr`, "ADMIN");
      const results = await Promise.allSettled([admin.update(a, { role: "EMPLOYE" }), admin.update(b, { role: "EMPLOYE" })]);
      const remaining = await prisma.credential.count({ where: { role: "ADMIN", isActive: true } });
      assert.ok(remaining >= 1, `manche ${round} : aucun administrateur restant`);
      assert.strictEqual(results.filter((r) => r.status === "fulfilled").length, 1, `manche ${round} : une seule rétrogradation doit réussir`);
    }
  });

  test("un compte inconnu : CREDENTIAL_NOT_FOUND ; e-mail retrouvé sans tenir compte de la casse", async () => {
    await assert.rejects(admin.update("99999999-9999-4999-8999-999999999999", { role: "ADMIN" }), { code: "CREDENTIAL_NOT_FOUND" });
    await make("casse@exemple.fr");
    assert.strictEqual((await admin.getByEmail("CASSE@Exemple.FR")).email, "casse@exemple.fr");
  });
});
