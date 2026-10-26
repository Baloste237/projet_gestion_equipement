import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";

process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

test("auth-service : l'envoi d'audit présente le secret interne à audit-service", async () => {
  const seen: { token?: string; path?: string }[] = [];
  const fake = http.createServer((req, res) => {
    seen.push({ token: req.headers["x-internal-token"] as string | undefined, path: req.url });
    res.writeHead(201, { "Content-Type": "application/json" }).end("{}");
  });
  await new Promise<void>((resolve) => fake.listen(0, resolve));
  process.env.AUDIT_SERVICE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  try {
    const { auditPublisher } = await import("../src/clients/audit-publisher.client");
    await auditPublisher.publish({ action: "TEST", routingKey: "auth.test", entityType: "Auth", entityId: "1", performedBy: "u1" });
    assert.deepStrictEqual(seen, [{ token: "test-internal", path: "/audit-logs" }]);
  } finally {
    fake.close();
  }
});
