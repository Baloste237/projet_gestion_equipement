import assert from "node:assert";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

test("le gateway refuse de démarrer sans JWT_SECRET (aucune valeur de repli)", () => {
  const envModule = path.join(__dirname, "..", "src", "config", "env.ts");
  const tsxLoader = pathToFileURL(require.resolve("tsx/cjs")).href;
  // Processus isolé, hors du dossier du gateway : aucun fichier .env ne peut fournir le secret
  const env = { ...process.env };
  delete env.JWT_SECRET;
  let failure = "";
  try {
    execFileSync(process.execPath, ["--import", tsxLoader, "-e", `require(${JSON.stringify(envModule)})`], {
      cwd: os.tmpdir(),
      env,
      stdio: "pipe",
    });
  } catch (err: any) {
    failure = String(err.stderr);
  }
  assert.match(failure, /JWT_SECRET/);
});
