import assert from "node:assert";
import { test, describe, before, beforeEach } from "node:test";
import bcrypt from "bcrypt";

process.env.JWT_SECRET = "test-secret";

let authService: typeof import("../src/services/auth.service")["authService"];
let credentialRepo: typeof import("../src/repositories/credential.repository")["credentialRepository"];
let refreshRepo: typeof import("../src/repositories/refresh-token.repository")["refreshTokenRepository"];
let publisher: typeof import("../src/clients/audit-publisher.client")["auditPublisher"];

const PASSWORD = "MotDePasse-Correct-1";
let accounts: Record<string, any>[] = [];
let created: Record<string, any>[] = [];
let auditEvents: Record<string, any>[] = [];

before(async () => {
  authService = (await import("../src/services/auth.service")).authService;
  credentialRepo = (await import("../src/repositories/credential.repository")).credentialRepository;
  refreshRepo = (await import("../src/repositories/refresh-token.repository")).refreshTokenRepository;
  publisher = (await import("../src/clients/audit-publisher.client")).auditPublisher;

  credentialRepo.findByEmail = (async (email: string) => accounts.find((a) => a.email === email) ?? null) as any;
  credentialRepo.create = (async (data: Record<string, any>) => {
    created.push(data);
    return { id: "new-id", isActive: true, ...data };
  }) as any;
  refreshRepo.create = (async (data: Record<string, any>) => data) as any;
  publisher.publish = (async (event: Record<string, any>) => {
    auditEvents.push(event);
  }) as any;
});

beforeEach(async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  accounts = [
    { id: "u1", email: "actif@exemple.fr", passwordHash, role: "EMPLOYE", isActive: true },
    { id: "u2", email: "desactive@exemple.fr", passwordHash, role: "EMPLOYE", isActive: false },
  ];
  created = [];
  auditEvents = [];
});

const failureOf = (promise: Promise<unknown>) => promise.then(() => null, (err) => err);

describe("auth-service : inscription sans élévation de privilèges", () => {
  test("ignore un rôle ADMIN fourni dans la requête : le compte est EMPLOYE", async () => {
    const result = await authService.register({ email: "nouveau@exemple.fr", password: PASSWORD, role: "ADMIN" } as any);
    assert.strictEqual(result.role, "EMPLOYE");
    assert.strictEqual(created[0].role, "EMPLOYE");
  });

  test("le schéma public ne déclare plus de champ rôle", async () => {
    const { registerSchema } = await import("../src/validators/auth.validator");
    assert.ok(!("role" in registerSchema.shape));
  });
});

describe("auth-service : connexion uniforme", () => {
  test("connexion réussie avec le bon mot de passe", async () => {
    const result = await authService.login({ email: "actif@exemple.fr", password: PASSWORD });
    assert.strictEqual(result.user.email, "actif@exemple.fr");
    assert.ok(result.accessToken);
  });

  test("e-mail inconnu, mot de passe faux et compte désactivé donnent la même erreur", async () => {
    const unknown = await failureOf(authService.login({ email: "inconnu@exemple.fr", password: PASSWORD }));
    const wrong = await failureOf(authService.login({ email: "actif@exemple.fr", password: "faux-faux-faux" }));
    const deactivated = await failureOf(authService.login({ email: "desactive@exemple.fr", password: PASSWORD }));

    for (const err of [unknown, wrong, deactivated]) {
      assert.strictEqual(err.statusCode, 401);
      assert.strictEqual(err.code, "INVALID_CREDENTIALS");
    }
    assert.strictEqual(unknown.message, wrong.message);
    assert.strictEqual(wrong.message, deactivated.message);
  });

  test("la cause réelle est conservée dans le journal d'audit", async () => {
    await failureOf(authService.login({ email: "inconnu@exemple.fr", password: PASSWORD }));
    await failureOf(authService.login({ email: "actif@exemple.fr", password: "faux-faux-faux" }));
    await failureOf(authService.login({ email: "desactive@exemple.fr", password: PASSWORD }));
    assert.deepStrictEqual(
      auditEvents.map((e) => e.metadata.error),
      ["Identifiants invalides", "Mot de passe incorrect", "Compte désactivé"]
    );
  });

  test("aucun mot de passe ni jeton dans les événements d'audit", async () => {
    await failureOf(authService.login({ email: "actif@exemple.fr", password: "faux-faux-faux" }));
    await authService.login({ email: "actif@exemple.fr", password: PASSWORD });
    const serialized = JSON.stringify(auditEvents);
    assert.ok(!serialized.includes("faux-faux-faux"));
    assert.ok(!serialized.includes(PASSWORD));
    assert.ok(!serialized.includes("eyJ"));
  });
});

describe("auth-service : secret de jeton obligatoire", () => {
  test("signAccessToken échoue sans JWT_SECRET (aucune valeur de repli)", async () => {
    const { signAccessToken } = await import("../src/utils/jwt.util");
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    assert.throws(() => signAccessToken({ id: "x", role: "EMPLOYE", permissions: [] } as any), /JWT_SECRET/);
    process.env.JWT_SECRET = saved;
  });

  test("assertSecurityConfig refuse de démarrer sans secret", async () => {
    const { assertSecurityConfig } = await import("../src/config/security-config");
    assert.throws(() => assertSecurityConfig("SECRET_INEXISTANT_POUR_TEST"), /SECRET_INEXISTANT_POUR_TEST/);
  });
});
