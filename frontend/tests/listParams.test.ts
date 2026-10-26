import assert from 'node:assert';
import { test, describe } from 'node:test';
import { EQUIPMENT_SORT_OPTIONS, cleanParams, sortFieldLabel } from '../src/utils/listParams.ts';
import { toApiBound } from '../src/utils/dateFr.ts';

describe('paramètres de liste', () => {
  test('omet les valeurs vides et garde les autres', () => {
    assert.deepStrictEqual(
      cleanParams({ page: 2, pageSize: 25, q: '  chaise ', status: '', categoryId: undefined, from: null, order: 'asc' }),
      { page: 2, pageSize: 25, q: 'chaise', order: 'asc' }
    );
    assert.deepStrictEqual(cleanParams({ q: '   ' }), {});
    assert.deepStrictEqual(cleanParams(), {});
  });

  test('conserve le zéro et ne transforme pas les nombres', () => {
    assert.deepStrictEqual(cleanParams({ page: 0 }), { page: 0 });
  });

  test('les quatre dates de tri correspondent aux champs du serveur, avec leurs libellés', () => {
    assert.deepStrictEqual(
      EQUIPMENT_SORT_OPTIONS.map((option) => option.field),
      ['createdAt', 'purchaseDate', 'commissionedAt', 'updatedAt']
    );
    assert.strictEqual(sortFieldLabel('purchaseDate'), "Date d'achat");
    assert.strictEqual(sortFieldLabel('updatedAt'), 'Dernière modification');
  });

  test('période : bornes converties selon la nature de la date, valeurs invalides omises', () => {
    const params = (field: 'createdAt' | 'purchaseDate', from: string, to: string) =>
      cleanParams({ from: toApiBound(from, field, 'from'), to: toApiBound(to, field, 'to') });
    assert.deepStrictEqual(params('purchaseDate', '01/01/2009', '31/12/2009'), { from: '2009-01-01', to: '2009-12-31' });
    const timestamps = params('createdAt', '01/10/2026', '');
    assert.deepStrictEqual(Object.keys(timestamps), ['from']);
    assert.match(String(timestamps.from), /^\d{4}-\d{2}-\d{2}T/);
    assert.deepStrictEqual(params('purchaseDate', '31/02/2026', ''), {});
  });
});
