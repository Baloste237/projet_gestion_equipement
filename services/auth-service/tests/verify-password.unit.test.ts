import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test, describe, before, after, beforeEach } from "node:test";
import bcrypt from "bcrypt";

process.env.JWT_SECRET = "test-secret";

let server: http.Server;
let origin: string;
let authService: typeof import("../src/services/auth.service")["authService"];
let credentialRepo: typeof import("../src/repositories/credential.repository")["credentialRepository"];
let signAccessToken: typeof import("../src/utils/jwt.util")["signAccessToken"];

const PASSWORD = "Super-Admin-Password-123!";
let accounts: Record<string, any>[] = [];

before(async () => {
  authService = (await import("../src/services/auth.service")).authService;
  credentialRepo = (await import("../src/repositories/credential.repository")).credentialRepository;
  signAccessToken = (await import("../src/utils/jwt.util")).signAccessToken;
  const app = (await import("../src/app")).default;

  credentialRepo.findById = (async (id: string) => accounts.find((a) => a.id === id) ?? null) as any;

  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  accounts = [
    { id: "admin-1", email: "admin@exemple.fr", passwordHash, role: "ADMIN", isActive: true },
    { id: "inactive-1", email: "inactive@exemple.fr", passwordHash, role: "ADMIN", isActive: false },
  ];
});

describe("auth-service : vérification de mot de passe", () => {
  test("authService.verifyPassword valide le mot de passe correct", async () => {
    const result = await authService.verifyPassword("admin-1", PASSWORD);
    assert.strictEqual(result.valid, true);
  });

  test("authService.verifyPassword rejette un mot de passe incorrect", async () => {
    await assert.rejects(
      authService.verifyPassword("admin-1", "mauvais-mot-de-passe"),
      (err: any) => err.code === "INVALID_CREDENTIALS"
    );
  });

  test("authService.verifyPassword rejette un compte inactif ou inexistant", async () => {
    await assert.rejects(
      authService.verifyPassword("inactive-1", PASSWORD),
      (err: any) => err.code === "INVALID_CREDENTIALS"
    );
    await assert.rejects(
      authService.verifyPassword("inconnu", PASSWORD),
      (err: any) => err.code === "INVALID_CREDENTIALS"
    );
  });

  test("HTTP POST /auth/verify-password avec token valide et bon mot de passe : 200", async () => {
    const token = signAccessToken({ id: "admin-1", role: "ADMIN", permissions: [] });
    const res = await fetch(`${origin}/auth/verify-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: PASSWORD }),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.valid, true);
  });

  test("HTTP POST /auth/verify-password avec mauvais mot de passe : 401", async () => {
    const token = signAccessToken({ id: "admin-1", role: "ADMIN", permissions: [] });
    const res = await fetch(`${origin}/auth/verify-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: "faux-mot-de-passe" }),
    });

    assert.strictEqual(res.status, 401);
  });

  test("HTTP POST /auth/verify-password sans token : 401", async () => {
    const res = await fetch(`${origin}/auth/verify-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: PASSWORD }),
    });

    assert.strictEqual(res.status, 401);
  });
});
