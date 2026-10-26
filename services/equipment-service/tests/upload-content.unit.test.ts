import assert from "node:assert";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { AddressInfo } from "node:net";
import { test, describe, before, after } from "node:test";
import jwt from "jsonwebtoken";
import { detectImageType } from "../src/utils/image-signature";

process.env.JWT_SECRET = "test-secret";
process.env.INTERNAL_SERVICE_TOKEN = "test-internal";

const ID = "11111111-1111-4111-8111-111111111111";
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(16, 1)]);
const uploadDir = path.join(__dirname, "..", "uploads", "equipments");

describe("détection du type réel d'une image", () => {
  test("reconnaît JPEG, PNG et WebP", () => {
    assert.strictEqual(detectImageType(JPEG), "jpeg");
    assert.strictEqual(detectImageType(PNG), "png");
    assert.strictEqual(detectImageType(WEBP), "webp");
  });
  test("rejette du texte, un exécutable, un SVG et un fichier vide", () => {
    assert.strictEqual(detectImageType(Buffer.from("<?php echo 1; ?>")), null);
    assert.strictEqual(detectImageType(Buffer.from("MZ\x90\x00\x03", "binary")), null);
    assert.strictEqual(detectImageType(Buffer.from("<svg onload=alert(1)>")), null);
    assert.strictEqual(detectImageType(Buffer.alloc(0)), null);
  });
});

describe("POST /api/equipments/:id/image : contenu vérifié", () => {
  let server: http.Server;
  let url: string;
  let updates: Record<string, any>[] = [];
  const before_ = new Set<string>();
  const token = jwt.sign({ id: "u1", role: "EMPLOYE", permissions: [] }, "test-secret", { expiresIn: "5m" });

  before(async () => {
    const { equipmentService } = await import("../src/services/equipment.service");
    equipmentService.update = (async (id: string, data: Record<string, any>) => (updates.push(data), { id, ...data })) as any;
    const app = (await import("../src/app")).default;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/equipments/${ID}/image`;
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.readdirSync(uploadDir).forEach((f) => before_.add(f));
  });

  after(() => {
    server.close();
    for (const f of fs.readdirSync(uploadDir)) if (!before_.has(f)) fs.rmSync(path.join(uploadDir, f), { force: true });
  });

  const send = (content: Buffer, name: string, type: string) => {
    const form = new FormData();
    form.append("image", new Blob([content], { type }), name);
    return fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  };
  const newFiles = () => fs.readdirSync(uploadDir).filter((f) => !before_.has(f));

  test("un fichier texte nommé .png avec le type image/png est rejeté (400) et supprimé", async () => {
    updates = [];
    const res = await send(Buffer.from("ceci n'est pas une image"), "faux.png", "image/png");
    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(newFiles(), []);
    assert.strictEqual(updates.length, 0);
  });

  test("un vrai JPEG est accepté ; l'extension vient du contenu, pas du nom envoyé", async () => {
    updates = [];
    const res = await send(JPEG, "photo.html", "image/jpeg");
    assert.strictEqual(res.status, 200);
    assert.match(updates[0].imageUrl, /^\/uploads\/equipments\/[\d-]+\.jpg$/);
    assert.strictEqual(newFiles().length, 1);
    assert.ok(newFiles()[0]!.endsWith(".jpg"));
  });
});
