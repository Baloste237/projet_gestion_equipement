import "dotenv/config";
import { relinkProfiles } from "../Services/relink.service";
import { prisma } from "../Config/prisma";

// Usage : npm run relink:profiles [-- --dry-run]
// Exige AUTH_SERVICE_URL et INTERNAL_SERVICE_TOKEN (comme le service lui-même).
const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  if (!process.env.INTERNAL_SERVICE_TOKEN) throw new Error("INTERNAL_SERVICE_TOKEN obligatoire");
  const summary = await relinkProfiles({ dryRun });
  console.log(dryRun ? "Simulation (aucune écriture) :" : "Reprise terminée :");
  console.log(`  reliées               : ${summary.linked}`);
  console.log(`  réalignées            : ${summary.aligned}`);
  console.log(`  identifiants retirés  : ${summary.cleared}`);
  console.log(`  inchangées            : ${summary.unchanged}`);
  console.log(`  conflits              : ${summary.conflicts.length}${summary.conflicts.length ? ` (${summary.conflicts.join(", ")})` : ""}`);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
