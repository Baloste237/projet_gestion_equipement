import assert from 'node:assert';
import { test, describe } from 'node:test';
import { evaluatePeriod, nextSort, toListParams } from '../src/utils/equipmentList.ts';
import { cleanParams } from '../src/utils/listParams.ts';

const state = {
  page: 2,
  pageSize: 25,
  q: '  chaise ',
  categoryId: '',
  status: 'A_COMPLETER',
  sort: 'purchaseDate' as const,
  order: 'asc' as const,
  from: '2009-01-01',
  to: undefined,
};

describe('paramètres envoyés pour la liste des équipements', () => {
  test('reprend l’état de la page et omet les valeurs vides une fois nettoyé', () => {
    assert.deepStrictEqual(cleanParams({ ...toListParams(state) }), {
      page: 2,
      pageSize: 25,
      q: 'chaise',
      status: 'A_COMPLETER',
      sort: 'purchaseDate',
      order: 'asc',
      from: '2009-01-01',
    });
  });
});

describe('période en cours de saisie', () => {
  test('champs vides : prête, sans borne (la période est effacée)', () => {
    assert.deepStrictEqual(evaluatePeriod('', '', 'createdAt'), { ready: true, from: undefined, to: undefined });
  });

  test('saisie incomplète : ni erreur ni application', () => {
    assert.deepStrictEqual(evaluatePeriod('01/1', '', 'createdAt'), { ready: false });
    assert.deepStrictEqual(evaluatePeriod('01/01/2026', '3', 'createdAt'), { ready: false });
  });

  test('date impossible complète : message sur le champ, non appliquée', () => {
    const result = evaluatePeriod('31/02/2026', '', 'createdAt');
    assert.strictEqual(result.ready, false);
    assert.match(result.fromError!, /invalide/);
    assert.strictEqual(result.from, undefined);
  });

  test('« au » antérieur à « du » : message sur « au »', () => {
    const result = evaluatePeriod('31/10/2026', '01/10/2026', 'purchaseDate');
    assert.strictEqual(result.ready, false);
    assert.match(result.toError!, /antérieure/);
  });

  test('période valide sur une date seule : AAAA-MM-JJ', () => {
    assert.deepStrictEqual(evaluatePeriod('01/01/2009', '31/12/2009', 'purchaseDate'), {
      ready: true,
      from: '2009-01-01',
      to: '2009-12-31',
    });
  });

  test('période valide sur un horodatage : date-heure ISO de la journée locale', () => {
    const result = evaluatePeriod('05/10/2026', '05/10/2026', 'createdAt');
    assert.strictEqual(result.ready, true);
    assert.match(result.from!, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(new Date(result.from!) < new Date(result.to!));
  });

  test('une seule borne est acceptée', () => {
    const result = evaluatePeriod('', '31/12/2009', 'commissionedAt');
    assert.deepStrictEqual([result.ready, result.from, result.to], [true, undefined, '2009-12-31']);
  });
});

describe('tri par clic sur un en-tête de date', () => {
  test('même champ : le sens s’inverse', () => {
    assert.deepStrictEqual(nextSort({ sort: 'createdAt', order: 'desc' }, 'createdAt'), { sort: 'createdAt', order: 'asc' });
    assert.deepStrictEqual(nextSort({ sort: 'createdAt', order: 'asc' }, 'createdAt'), { sort: 'createdAt', order: 'desc' });
  });

  test('autre champ : commence par le plus récent', () => {
    assert.deepStrictEqual(nextSort({ sort: 'createdAt', order: 'asc' }, 'purchaseDate'), { sort: 'purchaseDate', order: 'desc' });
  });
});
