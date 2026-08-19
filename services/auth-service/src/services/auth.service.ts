import bcrypt from "bcrypt";
import { credentialRepository } from "../repositories/credential.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { signAccessToken, generateRefreshTokenValue, parseExpiryToDate } from "../utils/jwt.util";
import { getPermissionsForRole } from "../config/permissions.config";
import { throwError } from "../errors/throw-error";
import { RegisterDTO, LoginDTO } from "../types/auth.type";
import { auditPublisher } from "../clients/audit-publisher.client";

const SALT_ROUNDS = 10;
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const authService = {
  register: async (data: RegisterDTO) => {
    const existing = await credentialRepository.findByEmail(data.email);
    if (existing) throwError("EMAIL_ALREADY_EXISTS");

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const credential = await credentialRepository.create({
      email: data.email,
      passwordHash,
      role: data.role || "EMPLOYE",
    });

    // On ne renvoie jamais le hash du mot de passe
    return { id: credential.id, email: credential.email, role: credential.role };
  },

  login: async (data: LoginDTO) => {
    const credential = await credentialRepository.findByEmail(data.email);
    if (!credential) throwError("INVALID_CREDENTIALS");
    if (!credential!.isActive) throwError("ACCOUNT_DEACTIVATED");

    const isPasswordValid = await bcrypt.compare(data.password, credential!.passwordHash);
    if (!isPasswordValid) throwError("INVALID_CREDENTIALS");

    const permissions = getPermissionsForRole(credential!.role);

    const accessToken = signAccessToken({
      id: credential!.id,
      role: credential!.role,
      permissions,
    });

    const refreshTokenValue = generateRefreshTokenValue();
    const expiresAt = parseExpiryToDate(REFRESH_EXPIRES_IN);

    await refreshTokenRepository.create({
      token: refreshTokenValue,
      credentialId: credential!.id,
      expiresAt,
    });

    auditPublisher.publish({
      action: "AUTH_LOGIN",
      routingKey: "auth.login",
      entityType: "Credential",
      entityId: credential!.id,
      performedBy: credential!.id,
      metadata: { email: credential!.email },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: credential!.id, email: credential!.email, role: credential!.role },
    };
  },

  refresh: async (refreshTokenValue: string) => {
    const storedToken = await refreshTokenRepository.findByToken(refreshTokenValue);

    if (!storedToken || storedToken.revoked) throwError("INVALID_REFRESH_TOKEN");
    if (storedToken!.expiresAt < new Date()) throwError("REFRESH_TOKEN_EXPIRED");

    const credential = storedToken!.credential;
    if (!credential.isActive) throwError("ACCOUNT_DEACTIVATED");

    const permissions = getPermissionsForRole(credential.role);

    const accessToken = signAccessToken({
      id: credential.id,
      role: credential.role,
      permissions,
    });

    return { accessToken };
  },

  logout: async (refreshTokenValue: string) => {
    const storedToken = await refreshTokenRepository.findByToken(refreshTokenValue);
    if (!storedToken) throwError("INVALID_REFRESH_TOKEN");

    await refreshTokenRepository.revoke(refreshTokenValue);
    return { success: true };
  },
};
