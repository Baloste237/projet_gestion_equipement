import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";

process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

test("inventory-service : les appels vers equipment-service présentent le secret interne", async () => {
  const seen: { path?: string; token?: string }[] = [];
  const fake = http.createServer((req, res) => {
    seen.push({ path: req.url, token: req.headers["x-internal-token"] as string | undefined });
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: [] }));
  });
  await new Promise<void>((resolve) => fake.listen(0, resolve));
  process.env.EQUIPMENT_SERVICE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/api`;
  try {
    const { equipmentServiceClient } = await import("../src/clients/equipment-service.client");
    await equipmentServiceClient.getEquipmentById("e1");
    await equipmentServiceClient.getAllEquipments();
    assert.deepStrictEqual(seen, [
      { path: "/api/equipments/e1", token: "test-internal" },
      { path: "/api/equipments", token: "test-internal" },
    ]);
  } finally {
    fake.close();
  }
});
