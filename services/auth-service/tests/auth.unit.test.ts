import assert from "node:assert";
import { test, describe } from "node:test";
import { signAccessToken, generateRefreshTokenValue, parseExpiryToDate } from "../src/utils/jwt.util";
import { registerSchema, loginSchema, refreshSchema } from "../src/validators/auth.validator";
import jwt from "jsonwebtoken";

describe("Auth Service Unit Tests - JWT & Validators", () => {
  test("signAccessToken generates a valid JWT token", () => {
    const payload = { userId: "user-123", email: "test@example.com", role: "ADMIN" };
    const token = signAccessToken(payload);
    assert.strictEqual(typeof token, "string");

    const decoded = jwt.decode(token) as any;
    assert.strictEqual(decoded.userId, "user-123");
    assert.strictEqual(decoded.email, "test@example.com");
    assert.strictEqual(decoded.role, "ADMIN");
  });

  test("generateRefreshTokenValue returns a non-empty string", () => {
    const refreshToken = generateRefreshTokenValue();
    assert.strictEqual(typeof refreshToken, "string");
    assert.ok(refreshToken.length > 10);
  });

  test("parseExpiryToDate correctly parses duration strings", () => {
    const now = new Date().getTime();
    const dateIn7Days = parseExpiryToDate("7d");
    const diffDays = Math.round((dateIn7Days.getTime() - now) / (1000 * 60 * 60 * 24));
    assert.strictEqual(diffDays, 7);

    const dateIn15m = parseExpiryToDate("15m");
    const diffMins = Math.round((dateIn15m.getTime() - now) / (1000 * 60));
    assert.strictEqual(diffMins, 15);
  });

  test("registerSchema validates correct user registration data", () => {
    const validData = {
      email: "newuser@domain.com",
      password: "securepassword123",
      role: "EMPLOYE",
    };
    const result = registerSchema.safeParse(validData);
    assert.strictEqual(result.success, true);
  });

  test("registerSchema rejects invalid email or short password", () => {
    const invalidEmail = { email: "invalid-email", password: "securepassword123" };
    assert.strictEqual(registerSchema.safeParse(invalidEmail).success, false);

    const shortPassword = { email: "test@domain.com", password: "short" };
    assert.strictEqual(registerSchema.safeParse(shortPassword).success, false);
  });

  test("loginSchema and refreshSchema validate inputs properly", () => {
    const validLogin = { email: "user@test.com", password: "password123" };
    assert.strictEqual(loginSchema.safeParse(validLogin).success, true);

    const validRefresh = { refreshToken: "abcdef1234567890" };
    assert.strictEqual(refreshSchema.safeParse(validRefresh).success, true);
  });
});
