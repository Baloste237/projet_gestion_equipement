import assert from 'node:assert';
import { test } from 'node:test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';
import { equipmentQrUrl, parseEquipmentQr } from '../src/utils/qrCode.ts';

const ID = '11111111-1111-4111-8111-111111111111';
const APP = 'https://parc.exemple.cm';

// Mêmes options que le composant QrCodeImage : ce que l'utilisateur télécharge ou imprime doit se relire
const decode = async (text: string, side: number) => {
  const dataUrl = await QRCode.toDataURL(text, { width: side, margin: 2, errorCorrectionLevel: 'M' });
  const png = PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
};

test("le QR téléchargé se relit et redonne l'adresse de la fiche publique", async () => {
  const url = equipmentQrUrl(ID, APP);
  assert.strictEqual(await decode(url, 192), url);
});

test("le QR se relit aussi à la taille d'une étiquette imprimée, jusqu'à l'identifiant de l'équipement", async () => {
  const scanned = await decode(equipmentQrUrl(ID, APP), 120);
  assert.strictEqual(parseEquipmentQr(scanned!, [APP]), ID);
});
