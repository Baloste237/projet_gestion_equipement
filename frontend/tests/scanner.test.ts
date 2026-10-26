import assert from 'node:assert';
import { test, describe } from 'node:test';
import { cameraErrorMessage, classifyCameraError, findBySerialNumber } from '../src/utils/scanner.ts';

const named = (name: string, message = '') => Object.assign(new Error(message), { name });

describe('Panne de caméra', () => {
  test('hors contexte sécurisé, la cause est HTTPS quelle que soit l\'erreur', () => {
    assert.strictEqual(classifyCameraError(named('NotAllowedError'), false), 'INSECURE_CONTEXT');
    assert.strictEqual(classifyCameraError(undefined, false), 'INSECURE_CONTEXT');
    assert.match(cameraErrorMessage(undefined, false), /HTTPS/);
  });

  test("distingue refus d'autorisation, absence de caméra et caméra occupée", () => {
    assert.strictEqual(classifyCameraError(named('NotAllowedError'), true), 'PERMISSION_DENIED');
    assert.strictEqual(classifyCameraError('Permission denied', true), 'PERMISSION_DENIED');
    assert.strictEqual(classifyCameraError(named('NotFoundError'), true), 'NO_CAMERA');
    assert.strictEqual(classifyCameraError('Error getting userMedia, error = NotFoundError: Requested device not found', true), 'NO_CAMERA');
    assert.strictEqual(classifyCameraError(named('NotReadableError'), true), 'CAMERA_BUSY');
  });

  test('toute autre erreur donne un message générique, et chaque message propose la saisie manuelle', () => {
    assert.strictEqual(classifyCameraError(new Error('bizarre'), true), 'UNKNOWN');
    assert.strictEqual(classifyCameraError(null, true), 'UNKNOWN');
    for (const error of [undefined, named('NotAllowedError'), named('NotFoundError'), named('NotReadableError'), new Error('x')]) {
      assert.match(cameraErrorMessage(error, true), /numéro de série/);
    }
  });
});

describe('Recherche par numéro de série', () => {
  const equipments = [
    { id: '1', serialNumber: 'SN-0001' },
    { id: '2', serialNumber: 'sn-0002' },
  ];

  test('correspondance exacte, sans tenir compte de la casse ni des espaces autour', () => {
    assert.strictEqual(findBySerialNumber(equipments, ' sn-0001 ')?.id, '1');
    assert.strictEqual(findBySerialNumber(equipments, 'SN-0002')?.id, '2');
  });

  test('rien de trouvé pour une saisie vide, partielle ou inconnue', () => {
    assert.strictEqual(findBySerialNumber(equipments, ''), null);
    assert.strictEqual(findBySerialNumber(equipments, '   '), null);
    assert.strictEqual(findBySerialNumber(equipments, 'SN-000'), null);
    assert.strictEqual(findBySerialNumber(equipments, 'INCONNU'), null);
  });
});
