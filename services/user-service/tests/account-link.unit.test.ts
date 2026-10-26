import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

const ACCOUNT_ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_ROOT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ADMIN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

type Credential = { id: string; email: string; role: string; isActive: boolean };
type Profile = Record<string, any>;

// ---- Faux auth-service : comptes en mémoire, mêmes routes internes que le vrai ----
let credentials: Credential[] = [];
let authPatches: [string, Record<string, unknown>][] = [];
let authTokens: (string | undefined)[] = [];
let authLookups: string[] = [];
let authDown = false;

const fakeAuth = http.createServer((req, res) => {
  authTokens.push(req.headers["x-internal-token"] as string | undefined);
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (authDown) return json(500, {});

  const url = decodeURIComponent(req.url || "");
  const byEmail = url.match(/^\/internal\/credentials\/by-email\/(.+)$/);
  if (req.method === "GET" && byEmail) {
    authLookups.push(byEmail[1]!);
    const found = credentials.find((c) => c.email.toLowerCase() === byEmail[1]!.toLowerCase());
    return found ? json(200, { data: found }) : json(404, {});
  }
  const patch = url.match(/^\/internal\/credentials\/(.+)$/);
  if (req.method === "PATCH" && patch) {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      authPatches.push([patch[1]!, body]);
      const credential = credentials.find((c) => c.id === patch[1]);
      if (!credential) return json(404, {});
      const losesAdmin =
        credential.role === "ADMIN" &&
        credential.isActive &&
        ((body.role !== undefined && body.role !== "ADMIN") || body.isActive === false);
      if (losesAdmin && credentials.filter((c) => c.role === "ADMIN" && c.isActive && c.id !== credential.id).length === 0) {
        return json(409, { code: "LAST_ADMIN", message: "Il doit rester au moins un administrateur actif" });
      }
      Object.assign(credential, body);
      return json(200, { data: credential });
    });
    return;
  }
  json(404, {});
});

// ---- Faux audit-service ----
let auditEvents: Record<string, any>[] = [];
const fakeAudit = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (req.method === "POST") auditEvents.push(JSON.parse(raw));
    res.writeHead(201, { "Content-Type": "application/json" }).end("{}");
  });
});

// ---- Profils en mémoire (pas de base de données) ----
let profiles: Profile[] = [];
let nextId = 1;

let server: http.Server;
let base: string;
const tokenFor = (id: string, role: string) => jwt.sign({ id, role, permissions: [] }, "test-secret", { expiresIn: "5m" });
const admin = { Authorization: `Bearer ${tokenFor(ADMIN_ID, "ADMIN")}` };

before(async () => {
  await new Promise<void>((resolve) => fakeAuth.listen(0, resolve));
  await new Promise<void>((resolve) => fakeAudit.listen(0, resolve));
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${(fakeAuth.address() as AddressInfo).port}`;
  process.env.AUDIT_SERVICE_URL = `http://127.0.0.1:${(fakeAudit.address() as AddressInfo).port}`;

  const { userRepository } = await import("../src/Repositories/user.repository");
  userRepository.findAll = (async () => profiles) as any;
  userRepository.findById = (async (id: string) => profiles.find((p) => p.id === id) ?? null) as any;
  userRepository.findByAuthUserId = (async (authUserId: string) => profiles.find((p) => p.authUserId === authUserId) ?? null) as any;
  userRepository.create = (async (data: Profile) => {
    const profile = { id: `profile-${nextId++}`, status: "ACTIF", ...data };
    profiles.push(profile);
    return profile;
  }) as any;
  userRepository.update = (async (id: string, data: Profile) => {
    const profile = profiles.find((p) => p.id === id)!;
    if (data.authUserId && profiles.some((p) => p.id !== id && p.authUserId === data.authUserId)) {
      throw Object.assign(new Error("unique"), { code: "P2002" });
    }
    Object.assign(profile, data);
    return profile;
  }) as any;
  userRepository.delete = (async (id: string) => {
    profiles = profiles.filter((p) => p.id !== id);
    return { id };
  }) as any;

  const app = (await import("../src/app")).default;
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/users`;
});

after(() => {
  server.close();
  fakeAuth.close();
  fakeAudit.close();
});

beforeEach(() => {
  credentials = [
    { id: ACCOUNT_ALICE, email: "alice@exemple.fr", role: "EMPLOYE", isActive: true },
    { id: ACCOUNT_ROOT, email: "root@exemple.fr", role: "ADMIN", isActive: true },
  ];
  profiles = [];
  authPatches = [];
  authTokens = [];
  authLookups = [];
  authDown = false;
  auditEvents = [];
});

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = admin) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
};
const create = (extra: Record<string, unknown> = {}) =>
  call("POST", "", { firstName: "Alice", lastName: "Martin", email: "alice@exemple.fr", ...extra });
const waitForAudit = async (count: number) => {
  for (let i = 0; i < 50 && auditEvents.length < count; i++) await new Promise((r) => setTimeout(r, 20));
};

describe("création d'une fiche : lien par e-mail", () => {
  test("compte existant : fiche reliée, rôle et état repris du compte, rôle saisi ignoré", async () => {
    const res = await create({ role: "ADMIN" });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.authUserId, ACCOUNT_ALICE);
    assert.strictEqual(res.body.data.role, "EMPLOYE");
    assert.strictEqual(res.body.data.linked, true);
  });

  test("le secret interne est présenté à auth-service", async () => {
    await create();
    assert.ok(authTokens.length > 0 && authTokens.every((t) => t === "test-internal"));
  });

  test("aucun compte pour cet e-mail : fiche créée non reliée, rôle saisi conservé", async () => {
    const res = await create({ email: "nouveau@exemple.fr", role: "AUDITEUR" });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.authUserId, null);
    assert.strictEqual(res.body.data.linked, false);
    assert.strictEqual(res.body.data.role, "AUDITEUR");
  });

  test("un authUserId fourni par le client est ignoré", async () => {
    const res = await create({ email: "nouveau@exemple.fr", authUserId: ACCOUNT_ROOT });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.authUserId, null);
    const forged = await create({ authUserId: ACCOUNT_ROOT });
    assert.strictEqual(forged.body.data.authUserId, ACCOUNT_ALICE);
  });

  test("e-mail en casse mixte : relié au compte en minuscules, stocké en minuscules", async () => {
    const res = await create({ email: "Alice@Exemple.FR" });
    assert.strictEqual(res.body.data.authUserId, ACCOUNT_ALICE);
    assert.strictEqual(res.body.data.email, "alice@exemple.fr");
  });

  test("auth-service injoignable : création refusée (502), aucune fiche créée", async () => {
    authDown = true;
    const res = await create();
    assert.strictEqual(res.status, 502);
    assert.strictEqual(profiles.length, 0);
  });
});

describe("changement de rôle : le compte fait foi", () => {
  test("promotion d'une fiche reliée : compte puis fiche, avec audit", async () => {
    const { body } = await create();
    const res = await call("PATCH", `/${body.data.id}/role`, { role: "RESPONSABLE" });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(authPatches, [[ACCOUNT_ALICE, { role: "RESPONSABLE" }]]);
    assert.strictEqual(credentials.find((c) => c.id === ACCOUNT_ALICE)!.role, "RESPONSABLE");
    assert.strictEqual(res.body.data.role, "RESPONSABLE");
    await waitForAudit(2);
    const sync = auditEvents.find((e) => e.action === "ACCOUNT_SYNCED");
    assert.ok(sync, "événement ACCOUNT_SYNCED attendu");
    assert.strictEqual(sync!.performedBy, ADMIN_ID);
  });

  test("auth-service en panne : 502 et ni compte ni fiche modifiés", async () => {
    const { body } = await create();
    authDown = true;
    const res = await call("PATCH", `/${body.data.id}/role`, { role: "RESPONSABLE" });
    assert.strictEqual(res.status, 502);
    assert.strictEqual(profiles[0].role, "EMPLOYE");
    assert.strictEqual(credentials.find((c) => c.id === ACCOUNT_ALICE)!.role, "EMPLOYE");
  });

  test("dernier administrateur : le 409 est relayé et la fiche n'est pas modifiée", async () => {
    const { body } = await create({ email: "root@exemple.fr" });
    assert.strictEqual(body.data.role, "ADMIN");
    const res = await call("PATCH", `/${body.data.id}/role`, { role: "EMPLOYE" });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.code, "LAST_ADMIN");
    assert.strictEqual(profiles[0].role, "ADMIN");
  });

  test("liaison tardive : la personne s'est inscrite après la création de sa fiche", async () => {
    const { body } = await create({ email: "tardif@exemple.fr" });
    assert.strictEqual(body.data.linked, false);
    credentials.push({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", email: "tardif@exemple.fr", role: "EMPLOYE", isActive: true });
    const res = await call("PATCH", `/${body.data.id}/role`, { role: "RESPONSABLE" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.linked, true);
    assert.strictEqual(credentials.find((c) => c.email === "tardif@exemple.fr")!.role, "RESPONSABLE");
    await waitForAudit(2);
    assert.ok(auditEvents.some((e) => e.action === "ACCOUNT_LINKED"));
  });

  test("fiche sans compte : seule la fiche change et la réponse indique linked: false", async () => {
    const { body } = await create({ email: "sans-compte@exemple.fr" });
    const res = await call("PATCH", `/${body.data.id}/role`, { role: "RESPONSABLE" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, "RESPONSABLE");
    assert.strictEqual(res.body.data.linked, false);
    assert.deepStrictEqual(authPatches, []);
  });

  test("l'écran envoie l'état par cette route : il suit le chemin de la désactivation", async () => {
    const { body } = await create();
    const res = await call("PATCH", `/${body.data.id}/role`, { role: "EMPLOYE", isActive: false, status: "INACTIF" });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(authPatches, [[ACCOUNT_ALICE, { role: "EMPLOYE", isActive: false }]]);
    assert.strictEqual(credentials.find((c) => c.id === ACCOUNT_ALICE)!.isActive, false);
    assert.strictEqual(profiles[0].isActive, false);
  });

  test("compte déjà relié à une autre fiche : 409 ACCOUNT_ALREADY_LINKED", async () => {
    const first = await create();
    const second = await call("POST", "", { firstName: "Alice", lastName: "Bis", email: "bis@exemple.fr" });
    credentials.push({ id: "ffffffff-ffff-4fff-8fff-ffffffffffff", email: "bis@exemple.fr", role: "EMPLOYE", isActive: true });
    profiles.find((p) => p.id === second.body.data.id)!.authUserId = null;
    // On simule un doublon : le compte de « bis » est déjà porté par une autre fiche
    profiles.find((p) => p.id === first.body.data.id)!.authUserId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const res = await call("PATCH", `/${second.body.data.id}/role`, { role: "RESPONSABLE" });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.code, "ACCOUNT_ALREADY_LINKED");
  });
});

describe("désactivation, réactivation, suppression", () => {
  test("désactiver une fiche reliée désactive le compte ; réactiver le réactive", async () => {
    const { body } = await create();
    const off = await call("PATCH", `/${body.data.id}/deactivate`);
    assert.strictEqual(off.status, 200);
    assert.strictEqual(credentials.find((c) => c.id === ACCOUNT_ALICE)!.isActive, false);
    assert.strictEqual(profiles[0].isActive, false);

    const on = await call("PATCH", `/${body.data.id}/reactivate`);
    assert.strictEqual(on.status, 200);
    assert.strictEqual(credentials.find((c) => c.id === ACCOUNT_ALICE)!.isActive, true);
    assert.strictEqual(profiles[0].isActive, true);
  });

  test("désactivation impossible si auth-service est en panne (502) ou si c'est le dernier admin (409)", async () => {
    const alice = await create();
    authDown = true;
    assert.strictEqual((await call("PATCH", `/${alice.body.data.id}/deactivate`)).status, 502);
    assert.strictEqual(profiles[0].isActive !== false, true);
    authDown = false;

    const root = await create({ email: "root@exemple.fr" });
    const res = await call("PATCH", `/${root.body.data.id}/deactivate`);
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.code, "LAST_ADMIN");
  });

  test("supprimer une fiche reliée désactive le compte avant, et le conserve", async () => {
    const { body } = await create();
    const res = await call("DELETE", `/${body.data.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(profiles.length, 0);
    const account = credentials.find((c) => c.id === ACCOUNT_ALICE)!;
    assert.ok(account, "le compte est conservé");
    assert.strictEqual(account.isActive, false);
  });

  test("suppression refusée (502) quand auth-service est injoignable : la fiche reste", async () => {
    const { body } = await create();
    authDown = true;
    assert.strictEqual((await call("DELETE", `/${body.data.id}`)).status, 502);
    assert.strictEqual(profiles.length, 1);
  });

  test("suppression d'une fiche sans compte : supprimée sans appel de modification", async () => {
    const { body } = await create({ email: "sans-compte@exemple.fr" });
    assert.strictEqual((await call("DELETE", `/${body.data.id}`)).status, 200);
    assert.deepStrictEqual(authPatches, []);
  });
});

describe("GET /users/me", () => {
  test("fiche reliée : renvoyée ; « me » n'est pas pris pour un identifiant", async () => {
    await create();
    const res = await call("GET", "/me", undefined, { Authorization: `Bearer ${tokenFor(ACCOUNT_ALICE, "EMPLOYE")}` });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.email, "alice@exemple.fr");
    assert.strictEqual(res.body.data.linked, true);
  });

  test("utilisateur sans fiche reliée : 404", async () => {
    const res = await call("GET", "/me", undefined, { Authorization: `Bearer ${tokenFor(ACCOUNT_ROOT, "ADMIN")}` });
    assert.strictEqual(res.status, 404);
  });

  test("sans jeton : 401 ; avec le secret interne seul : 401", async () => {
    assert.strictEqual((await call("GET", "/me", undefined, {})).status, 401);
    assert.strictEqual((await call("GET", "/me", undefined, { "x-internal-token": "test-internal" })).status, 401);
  });

  test("l'utilisateur relié peut modifier son propre profil (le lien rend la règle vraie)", async () => {
    const { body } = await create();
    const own = { Authorization: `Bearer ${tokenFor(ACCOUNT_ALICE, "EMPLOYE")}` };
    assert.strictEqual((await call("PATCH", `/${body.data.id}`, { firstName: "Alicia" }, own)).status, 200);
    const other = { Authorization: `Bearer ${tokenFor(ACCOUNT_ROOT, "EMPLOYE")}` };
    assert.strictEqual((await call("PATCH", `/${body.data.id}`, { firstName: "Pirate" }, other)).status, 403);
  });
});
