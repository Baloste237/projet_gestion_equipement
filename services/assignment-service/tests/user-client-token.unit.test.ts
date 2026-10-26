import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { test } from "node:test";

process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

test("assignment-service : les appels vers user-service présentent le secret interne", async () => {
  const seen: { method?: string; path?: string; token?: string }[] = [];
  const fake = http.createServer((req, res) => {
    seen.push({ method: req.method, path: req.url, token: req.headers["x-internal-token"] as string | undefined });
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: { id: "test-id" } }));
  });
  await new Promise<void>((resolve) => fake.listen(0, resolve));
  process.env.USER_SERVICE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/api`;
  try {
    const { userServiceClient } = await import("../src/clients/user-service.client");
    await userServiceClient.getUserById("u1");
    await userServiceClient.getDepartmentById("d1");
    await userServiceClient.getPositionById("p1");
    assert.deepStrictEqual(
      seen.map((s) => `${s.method} ${s.path} ${s.token}`),
      [
        "GET /api/users/u1 test-internal",
        "GET /api/departments/d1 test-internal",
        "GET /api/positions/p1 test-internal",
      ]
    );
  } finally {
    fake.close();
  }
});
