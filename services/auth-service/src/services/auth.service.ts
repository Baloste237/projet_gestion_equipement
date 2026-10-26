import bcrypt from "bcrypt";
import { credentialRepository } from "../repositories/credential.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { signAccessToken, generateRefreshTokenValue, parseExpiryToDate } from "../utils/jwt.util";
import { getPermissionsForRole } from "../config/permissions.config";
import { throwError } from "../errors/throw-error";
import { RegisterDTO, LoginDTO } from "../types/auth.type";
import { auditPublisher } from "../clients/audit-publisher.client";

const SALT_ROUNDS = 10;
// Hash factice : la durée de réponse du login ne révèle pas si l'e-mail existe
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("mot-de-passe-factice", SALT_ROUNDS);
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const authService = {
  register: async (data: RegisterDTO) => {
    const existing = await credentialRepository.findByEmail(data.email);
    if (existing) throwError("EMAIL_ALREADY_EXISTS");

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const credential = await credentialRepository.create({
      // E-mail normalisé en minuscules : sert de clé de rapprochement avec les fiches utilisateurs
      email: data.email.trim().toLowerCase(),
      passwordHash,
      // Inscription publique : toujours le rôle le plus bas, jamais celui de la requête
      role: "EMPLOYE",
    });

    auditPublisher.publish({
      action: "USER_REGISTER",
      routingKey: "auth.register",
      entityType: "Credential",
      entityId: credential.id,
      performedBy: credential.email,
      metadata: { email: credential.email, httpStatus: 201, role: credential.role },
    });

    return { id: credential.id, email: credential.email, role: credential.role };
  },

  login: async (data: LoginDTO) => {
    const credential = await credentialRepository.findByEmail(data.email);

    // Comparaison toujours effectuée (hash factice si le compte n'existe pas)
    const isPasswordValid = await bcrypt.compare(data.password, credential?.passwordHash ?? DUMMY_PASSWORD_HASH);

    // Même réponse pour compte inconnu, mot de passe faux et compte désactivé ;
    // la cause réelle reste uniquement dans le journal d'audit.
    const failure = !credential
      ? { id: data.email, email: data.email, reason: "Identifiants invalides" }
      : !isPasswordValid
        ? { id: credential.id, email: credential.email, reason: "Mot de passe incorrect" }
        : !credential.isActive
          ? { id: credential.id, email: credential.email, reason: "Compte désactivé" }
          : null;

    if (failure) {
      auditPublisher.publish({
        action: "AUTHENTICATION_FAILED",
        routingKey: "auth.failed",
        entityType: "Auth",
        entityId: failure.id,
        performedBy: failure.email,
        metadata: { email: failure.email, httpStatus: 401, error: failure.reason },
      });
      throwError("INVALID_CREDENTIALS");
    }

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
      action: "AUTHENTICATION_SUCCESS",
      routingKey: "auth.login",
      entityType: "Credential",
      entityId: credential!.id,
      performedBy: credential!.email,
      metadata: { email: credential!.email, httpStatus: 200, role: credential!.role },
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

  verifyPassword: async (userId: string, password: string) => {
    const credential = await credentialRepository.findById(userId);
    if (!credential || !credential.isActive) {
      throwError("INVALID_CREDENTIALS", "Mot de passe incorrect");
    }
    const isPasswordValid = await bcrypt.compare(password, credential.passwordHash);
    if (!isPasswordValid) {
      throwError("INVALID_CREDENTIALS", "Mot de passe incorrect");
    }
    return { valid: true };
  },
};
