import "dotenv/config";
import bcrypt from "bcrypt";
import { credentialRepository } from "../repositories/credential.repository";
import { prisma } from "../config/prisma";

// Amorçage du premier administrateur : aucune route HTTP, idempotent.
// Usage : ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin
const MIN_PASSWORD_LENGTH = 12;

const main = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
  }

  const existing = await credentialRepository.findByEmail(email);
  if (existing) {
    console.log(`Le compte ${email} existe déjà (rôle ${existing.role}) : aucune modification.`);
    return;
  }

  await credentialRepository.create({ email, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" });
  console.log(`Administrateur ${email} créé.`);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
