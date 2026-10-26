import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  MAX_IMPORT_FILE_BYTES,
  exportFilename,
  findDuplicateFields,
  hasNameSource,
  initialMapping,
  readingNotes,
  parseImportErrors,
  toMappingPayload,
  validateImportFile,
} from '../src/utils/importMapping.ts';
import { EQUIPMENT_STATUSES, EQUIPMENT_STATUS_LABELS, parseStatusParam } from '../src/utils/equipmentStatus.ts';

describe('validateImportFile', () => {
  test('accepte un .csv et un .xlsx, sans tenir compte de la casse', () => {
    assert.strictEqual(validateImportFile({ name: 'parc.csv', size: 1200 }), null);
    assert.strictEqual(validateImportFile({ name: 'PARC.XLSX', size: 1200 }), null);
  });

  test('refuse un format non pris en charge avant tout envoi', () => {
    assert.match(validateImportFile({ name: 'notes.txt', size: 10 })!, /\.csv ou \.xlsx/);
    assert.match(validateImportFile({ name: 'ancien.xls', size: 10 })!, /\.csv ou \.xlsx/);
    assert.match(validateImportFile({ name: 'sans-extension', size: 10 })!, /\.csv ou \.xlsx/);
  });

  test('refuse un fichier vide ou de plus de 5 Mo, exactement 5 Mo est accepté', () => {
    assert.match(validateImportFile({ name: 'a.csv', size: 0 })!, /vide/);
    assert.match(validateImportFile({ name: 'a.csv', size: MAX_IMPORT_FILE_BYTES + 1 })!, /trop volumineux/);
    assert.strictEqual(validateImportFile({ name: 'a.csv', size: MAX_IMPORT_FILE_BYTES }), null);
  });
});

describe('mapping des colonnes', () => {
  const headers = ['Nom', 'Réf. constructeur', 'Site'];

  test('initialMapping reprend la suggestion et ignore le reste', () => {
    assert.deepStrictEqual(initialMapping(headers, { Nom: 'name' }), { Nom: 'name', 'Réf. constructeur': '', Site: '' });
  });

  test('findDuplicateFields signale la colonne qui réutilise un champ déjà pris', () => {
    const duplicates = findDuplicateFields({ SN: 'serialNumber', 'Réf. constructeur': 'serialNumber', Nom: 'name', Site: '' });
    assert.deepStrictEqual(duplicates, { 'Réf. constructeur': 'SN' });
    assert.deepStrictEqual(findDuplicateFields({ Nom: 'name', Site: '' }), {});
  });

  test('findDuplicateFields accepte plusieurs colonnes de notes mais pas deux colonnes de nom', () => {
    assert.deepStrictEqual(findDuplicateFields({ CARACTERISTIQUES: 'notes', 'OBSERVATIONS / HISTORIQUE': 'notes' }), {});
    assert.deepStrictEqual(findDuplicateFields({ A: 'name', B: 'name' }), { B: 'A' });
  });

  test('hasNameSource : nom, ou marque/modèle qui servent à le déduire', () => {
    assert.strictEqual(hasNameSource({ Nom: 'name' }), true);
    assert.strictEqual(hasNameSource({ Marque: 'brand' }), true);
    assert.strictEqual(hasNameSource({ Modèle: 'model' }), true);
    assert.strictEqual(hasNameSource({ CATEGORIE: 'category' }), true);
    assert.strictEqual(hasNameSource({ Site: 'location', Autre: '' }), false);
  });

  test('readingNotes décrit l’en-tête détecté et les lignes ignorées, et se tait pour un fichier simple', () => {
    assert.deepStrictEqual(readingNotes({ headerRow: 1, ignoredRowCount: 0 }), []);
    assert.deepStrictEqual(readingNotes({}), []);
    const notes = readingNotes({ headerRow: 5, ignoredRowCount: 912 });
    assert.match(notes[0], /en ligne 5/);
    assert.match(notes[1], /912 lignes vides ignorées/);
    assert.match(notes[2], /LISTE DES VALEURS/);
    assert.match(readingNotes({ headerRow: 1, ignoredRowCount: 1 })[0], /^1 ligne vide ignorée./);
  });

  test('toMappingPayload n’envoie que les colonnes associées', () => {
    assert.deepStrictEqual(toMappingPayload({ Nom: 'name', Site: '', 'Réf.': 'serialNumber' }), {
      Nom: 'name',
      'Réf.': 'serialNumber',
    });
  });
});

describe('parseImportErrors', () => {
  test('lit les erreurs par ligne renvoyées par le serveur', () => {
    assert.deepStrictEqual(
      parseImportErrors([
        { row: 3, message: 'Nom manquant' },
        { row: 0, message: 'Numéro de série « X » déjà enregistré' },
      ]),
      [
        { row: 3, message: 'Nom manquant' },
        { row: 0, message: 'Numéro de série « X » déjà enregistré' },
      ]
    );
  });

  test('ignore les détails inattendus sans lever d’erreur', () => {
    assert.deepStrictEqual(parseImportErrors(undefined), []);
    assert.deepStrictEqual(parseImportErrors('oops'), []);
    assert.deepStrictEqual(parseImportErrors([null, 3, { foo: 1 }, { message: 'ok' }]), [{ row: 0, message: 'ok' }]);
  });
});

describe('export et statuts', () => {
  test('exportFilename est daté et porte le format demandé', () => {
    const date = new Date('2026-09-28T10:00:00Z');
    assert.strictEqual(exportFilename('csv', date), 'equipements-2026-09-28.csv');
    assert.strictEqual(exportFilename('xlsx', date), 'equipements-2026-09-28.xlsx');
  });

  test('« À compléter » est un statut connu, libellé et filtrable', () => {
    assert.ok(EQUIPMENT_STATUSES.includes('A_COMPLETER'));
    assert.strictEqual(EQUIPMENT_STATUS_LABELS.A_COMPLETER, 'À compléter');
    assert.strictEqual(parseStatusParam('IN_MAINTENANCE'), 'IN_MAINTENANCE');
    assert.strictEqual(parseStatusParam('A_COMPLETER'), 'A_COMPLETER');
  });

  test('parseStatusParam ignore une valeur d’URL inconnue', () => {
    assert.strictEqual(parseStatusParam('HACK'), '');
    assert.strictEqual(parseStatusParam(null), '');
    assert.strictEqual(parseStatusParam(undefined), '');
  });
});
