import assert from 'node:assert';
import { test, describe } from 'node:test';
import { equipmentQrUrl, parseEquipmentQr, publicAppUrl, qrFilename } from '../src/utils/qrCode.ts';

const ID = '11111111-1111-4111-8111-111111111111';
const APP = 'https://parc.exemple.cm';

describe("Adresse encodée dans le QR code", () => {
  test("utilise l'adresse publique configurée, sans barre finale", () => {
    assert.strictEqual(publicAppUrl('https://parc.exemple.cm/', 'http://localhost:5173'), APP);
    assert.strictEqual(equipmentQrUrl(ID, publicAppUrl('https://parc.exemple.cm/', 'http://localhost:5173')), `${APP}/e/${ID}`);
  });

  test("retombe sur l'origine courante sans configuration (ou avec une valeur vide)", () => {
    assert.strictEqual(publicAppUrl(undefined, 'http://localhost:5173'), 'http://localhost:5173');
    assert.strictEqual(publicAppUrl('   ', 'http://localhost:5173'), 'http://localhost:5173');
    assert.strictEqual(equipmentQrUrl(ID, publicAppUrl(undefined, 'http://localhost:5173')), `http://localhost:5173/e/${ID}`);
  });

  test("conserve un chemin de base (application servie dans un sous-dossier)", () => {
    assert.strictEqual(equipmentQrUrl(ID, 'https://exemple.cm/parc/'), `https://exemple.cm/parc/e/${ID}`);
  });
});

describe("Lecture d'un code scanné", () => {
  test("reconnaît l'adresse d'une fiche de l'application", () => {
    assert.strictEqual(parseEquipmentQr(`${APP}/e/${ID}`, [APP]), ID);
    assert.strictEqual(parseEquipmentQr(`  ${APP}/e/${ID}  `, [APP]), ID);
  });

  test("accepte l'adresse publique ou l'origine courante", () => {
    const bases = [APP, 'http://localhost:5173'];
    assert.strictEqual(parseEquipmentQr(`http://localhost:5173/e/${ID}`, bases), ID);
    assert.strictEqual(parseEquipmentQr(`${APP}/e/${ID}`, bases), ID);
  });

  test("refuse l'adresse d'un autre site, même avec la même forme", () => {
    assert.strictEqual(parseEquipmentQr(`https://autre-site.com/e/${ID}`, [APP]), null);
    assert.strictEqual(parseEquipmentQr(`https://parc.exemple.cm.pirate.com/e/${ID}`, [APP]), null);
    assert.strictEqual(parseEquipmentQr(`http://parc.exemple.cm/e/${ID}`, [APP]), null);
  });

  test("refuse un texte quelconque, un identifiant invalide ou un chemin différent", () => {
    assert.strictEqual(parseEquipmentQr('SN-0001', [APP]), null);
    assert.strictEqual(parseEquipmentQr('', [APP]), null);
    assert.strictEqual(parseEquipmentQr(`${APP}/e/pas-un-uuid`, [APP]), null);
    assert.strictEqual(parseEquipmentQr(`${APP}/equipments/${ID}`, [APP]), null);
    assert.strictEqual(parseEquipmentQr(`${APP}/e/${ID}/suite`, [APP]), null);
    assert.strictEqual(parseEquipmentQr(`javascript:alert(1)//e/${ID}`, [APP]), null);
  });

  test("gère un chemin de base et ignore une adresse de base invalide", () => {
    assert.strictEqual(parseEquipmentQr(`https://exemple.cm/parc/e/${ID}`, ['https://exemple.cm/parc']), ID);
    assert.strictEqual(parseEquipmentQr(`https://exemple.cm/e/${ID}`, ['https://exemple.cm/parc']), null);
    assert.strictEqual(parseEquipmentQr(`${APP}/e/${ID}`, ['pas une url', APP]), ID);
  });

  test("le QR généré par l'application est relu par le scanner", () => {
    assert.strictEqual(parseEquipmentQr(equipmentQrUrl(ID, APP), [APP]), ID);
  });
});

describe("Nom du fichier téléchargé", () => {
  test("est déduit du numéro de série et nettoyé", () => {
    assert.strictEqual(qrFilename('SN-88392-XXT'), 'qr-SN-88392-XXT.png');
    assert.strictEqual(qrFilename('N° 12/34 é'), 'qr-N-12-34.png');
    assert.strictEqual(qrFilename('///'), 'qr-equipement.png');
  });
});
