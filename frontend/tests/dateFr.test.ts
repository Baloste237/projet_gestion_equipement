import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  checkPeriod,
  endOfLocalDayIso,
  formatDateFr,
  maskDateFr,
  parseDateFr,
  startOfLocalDayIso,
  toApiBound,
  toIsoDate,
} from '../src/utils/dateFr.ts';

describe('masque de saisie jj/mm/AAAA', () => {
  test('ajoute les séparateurs au fil de la frappe', () => {
    assert.strictEqual(maskDateFr('3'), '3');
    assert.strictEqual(maskDateFr('31'), '31');
    assert.strictEqual(maskDateFr('311'), '31/1');
    assert.strictEqual(maskDateFr('3112'), '31/12');
    assert.strictEqual(maskDateFr('31122'), '31/12/2');
    assert.strictEqual(maskDateFr('31122026'), '31/12/2026');
  });

  test('ignore les lettres et tronque à 8 chiffres', () => {
    assert.strictEqual(maskDateFr('3a1b1c2d2e0f2g6'), '31/12/2026');
    assert.strictEqual(maskDateFr('31a12b02'), '31/12/02');
    assert.strictEqual(maskDateFr('311220269999'), '31/12/2026');
    assert.strictEqual(maskDateFr(''), '');
  });

  test('un texte collé avec d’autres séparateurs est reconnu et complété', () => {
    assert.strictEqual(maskDateFr('1-1-2026'), '01/01/2026');
    assert.strictEqual(maskDateFr('1.2.2026'), '01/02/2026');
    assert.strictEqual(maskDateFr('5 3 2025'), '05/03/2025');
    assert.strictEqual(maskDateFr('31/12/2026'), '31/12/2026');
  });
});

describe('analyse jj/mm/AAAA', () => {
  test('accepte les dates existantes, années bissextiles comprises', () => {
    assert.deepStrictEqual(parseDateFr('31/12/2026'), { day: 31, month: 12, year: 2026 });
    assert.deepStrictEqual(parseDateFr('29/02/2028'), { day: 29, month: 2, year: 2028 });
    assert.deepStrictEqual(parseDateFr('29/02/2000'), { day: 29, month: 2, year: 2000 });
    assert.deepStrictEqual(parseDateFr(' 01/01/2009 '), { day: 1, month: 1, year: 2009 });
  });

  test('refuse les dates impossibles', () => {
    for (const bad of ['31/02/2026', '29/02/2026', '29/02/1900', '30/02/2028', '31/04/2026', '00/10/2026', '10/00/2026', '10/13/2026', '32/01/2026']) {
      assert.strictEqual(parseDateFr(bad), null, bad);
    }
  });

  test('refuse les formats incomplets ou étrangers', () => {
    for (const bad of ['', '1/1/2026', '01/01/26', '2026-10-02', '01-01-2026', '01/01/20266', 'aa/bb/cccc', '01/01/1899', '01/01/2101']) {
      assert.strictEqual(parseDateFr(bad), null, bad);
    }
  });

  test('conversion en AAAA-MM-JJ', () => {
    assert.strictEqual(toIsoDate('09/01/2009'), '2009-01-09');
    assert.strictEqual(toIsoDate('31/02/2026'), null);
  });
});

describe('bornes de période pour l’API', () => {
  test('journée locale : début à 00:00:00.000 et fin à 23:59:59.999, quel que soit le fuseau', () => {
    const start = new Date(startOfLocalDayIso('05/10/2026')!);
    const end = new Date(endOfLocalDayIso('05/10/2026')!);
    assert.deepStrictEqual([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()], [2026, 9, 5, 0, 0]);
    assert.deepStrictEqual([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()], [2026, 9, 5, 23, 59, 59, 999]);
    assert.strictEqual(startOfLocalDayIso('31/02/2026'), null);
  });

  test('horodatages (ajout, modification) : date-heure ISO ; dates seules (achat, mise en service) : AAAA-MM-JJ', () => {
    assert.match(toApiBound('05/10/2026', 'createdAt', 'from')!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.match(toApiBound('05/10/2026', 'updatedAt', 'to')!, /T/);
    assert.strictEqual(toApiBound('05/10/2026', 'purchaseDate', 'from'), '2026-10-05');
    assert.strictEqual(toApiBound('05/10/2026', 'commissionedAt', 'to'), '2026-10-05');
    assert.strictEqual(toApiBound('n’importe quoi', 'purchaseDate', 'from'), null);
  });
});

describe('affichage jj/mm/AAAA', () => {
  test('une date seule enregistrée à minuit UTC reste le même jour', () => {
    assert.strictEqual(formatDateFr('2009-01-09T00:00:00.000Z', 'purchaseDate'), '09/01/2009');
    assert.strictEqual(formatDateFr('2024-06-24T00:00:00.000Z', 'commissionedAt'), '24/06/2024');
  });

  test('un horodatage est affiché en heure locale', () => {
    const iso = new Date(2026, 9, 5, 0, 30).toISOString();
    assert.strictEqual(formatDateFr(iso, 'createdAt'), '05/10/2026');
    assert.strictEqual(formatDateFr(iso), '05/10/2026');
  });

  test('valeur absente ou illisible : texte vide', () => {
    assert.strictEqual(formatDateFr(null), '');
    assert.strictEqual(formatDateFr(undefined, 'purchaseDate'), '');
    assert.strictEqual(formatDateFr('pas une date'), '');
  });
});

describe('contrôle de la période saisie', () => {
  test('champs vides : valide (période facultative)', () => {
    assert.deepStrictEqual(checkPeriod('', ''), { valid: true });
    assert.deepStrictEqual(checkPeriod('  ', ''), { valid: true });
  });

  test('une seule borne valide', () => {
    assert.strictEqual(checkPeriod('01/10/2026', '').valid, true);
    assert.strictEqual(checkPeriod('', '31/10/2026').valid, true);
  });

  test('date impossible : message sur le champ concerné', () => {
    const result = checkPeriod('31/02/2026', '');
    assert.strictEqual(result.valid, false);
    assert.match(result.fromError!, /invalide/);
    assert.strictEqual(result.toError, undefined);
    assert.match(checkPeriod('', '15/15/2026').toError!, /invalide/);
  });

  test('« au » antérieur à « du » : refusé ; même jour : accepté', () => {
    const result = checkPeriod('31/10/2026', '01/10/2026');
    assert.strictEqual(result.valid, false);
    assert.match(result.toError!, /antérieure/);
    assert.strictEqual(checkPeriod('01/10/2026', '01/10/2026').valid, true);
    assert.strictEqual(checkPeriod('31/12/2025', '01/01/2026').valid, true);
  });
});
