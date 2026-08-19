import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.type";

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_partage_entre_services";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN as any });
};

export const generateRefreshTokenValue = (): string => {
  // Chaîne aléatoire simple, stockée en base pour permettre la révocation
  return jwt.sign({ random: Math.random() }, JWT_SECRET, { expiresIn: "7d" });
};

export const parseExpiryToDate = (expiresIn: string): Date => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error("Format d'expiration invalide");

  const value = match[1] ?? "0";
  const unit = match[2] ?? "s";
  const now = new Date();
  const amount = parseInt(value, 10);

  switch (unit) {
    case "s": return new Date(now.getTime() + amount * 1000);
    case "m": return new Date(now.getTime() + amount * 60 * 1000);
    case "h": return new Date(now.getTime() + amount * 60 * 60 * 1000);
    case "d": return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
    default: throw new Error("Unité d'expiration invalide");
  }
};
