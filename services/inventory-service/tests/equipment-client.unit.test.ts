import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";

process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

// equipment-service simulé : la liste complète (sans page ni pageSize) renvoie `data` seul, comme avant la pagination
test("inventory-service : la lecture de tous les équipements ne dépend pas de la pagination", async () => {
  const requests: { url?: string; token?: string }[] = [];
  const fake = http.createServer((req, res) => {
    requests.push({ url: req.url, token: req.headers["x-internal-token"] as string | undefined });
    const data = Array.from({ length: 620 }, (_, i) => ({ id: `eq-${i}`, status: "AVAILABLE", categoryId: "c1" }));
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ success: true, data }));
  });
  await new Promise<void>((resolve) => fake.listen(0, resolve));
  process.env.EQUIPMENT_SERVICE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/api`;
  try {
    const { equipmentServiceClient } = await import("../src/clients/equipment-service.client");
    const equipments = await equipmentServiceClient.getAllEquipments();
    assert.strictEqual(equipments.length, 620);
    assert.strictEqual(requests[0].url, "/api/equipments");
    assert.strictEqual(requests[0].token, "test-internal");
  } finally {
    fake.close();
  }
});
