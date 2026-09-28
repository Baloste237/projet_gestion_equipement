import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  MAX_BULK_ASSIGNMENTS,
  deselectAll,
  describeRefusal,
  exceedsLimit,
  filterByQuery,
  isSelectable,
  parseBulkRefusals,
  pruneSelection,
  selectAllSelectable,
  selectionState,
  successMessage,
  toggleSelection,
} from '../src/utils/equipmentSelection.ts';

type Eq = Parameters<typeof selectAllSelectable>[0][number];
const eq = (id: string, status: Eq['status'] = 'AVAILABLE') => ({ id, status });

describe('sélectionnable', () => {
  test('seuls les équipements disponibles sont sélectionnables', () => {
    assert.strictEqual(isSelectable({ status: 'AVAILABLE' }), true);
    for (const status of ['ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'A_COMPLETER'] as const) {
      assert.strictEqual(isSelectable({ status }), false, status);
    }
  });
});

describe('sélection', () => {
  test('toggleSelection ajoute puis retire, sans modifier l’ensemble d’origine', () => {
    const start = new Set(['a']);
    const added = toggleSelection(start, 'b');
    assert.deepStrictEqual([...added], ['a', 'b']);
    assert.deepStrictEqual([...start], ['a']);
    assert.deepStrictEqual([...toggleSelection(added, 'a')], ['b']);
  });

  test('« tout sélectionner » sur des résultats filtrés ne retient que les disponibles', () => {
    const filtered = [eq('a'), eq('b', 'ASSIGNED'), eq('c'), eq('d', 'A_COMPLETER')];
    assert.deepStrictEqual([...selectAllSelectable(filtered, new Set())], ['a', 'c']);
  });

  test('« tout sélectionner » conserve ce qui était déjà retenu hors du filtre actuel', () => {
    const next = selectAllSelectable([eq('c')], new Set(['z']));
    assert.deepStrictEqual([...next].sort(), ['c', 'z']);
  });

  test('deselectAll retire seulement les équipements de la liste donnée', () => {
    assert.deepStrictEqual([...deselectAll([eq('a'), eq('b')], new Set(['a', 'b', 'z']))], ['z']);
  });

  test('selectionState : aucun, partiel, tous (les équipements non sélectionnables sont ignorés)', () => {
    const list = [eq('a'), eq('b'), eq('c', 'ASSIGNED')];
    assert.strictEqual(selectionState(list, new Set()), 'none');
    assert.strictEqual(selectionState(list, new Set(['a'])), 'some');
    assert.strictEqual(selectionState(list, new Set(['a', 'b'])), 'all');
    assert.strictEqual(selectionState([eq('x', 'ASSIGNED')], new Set()), 'none');
    assert.strictEqual(selectionState([], new Set()), 'none');
  });

  test('pruneSelection retire les équipements disparus ou devenus indisponibles', () => {
    const after = [eq('a'), eq('b', 'ASSIGNED')];
    assert.deepStrictEqual([...pruneSelection(after, new Set(['a', 'b', 'gone']))], ['a']);
  });
});

describe('limite de 200', () => {
  test('le plafond est de 200 : 200 passe, 201 est refusé', () => {
    assert.strictEqual(MAX_BULK_ASSIGNMENTS, 200);
    assert.strictEqual(exceedsLimit(200), false);
    assert.strictEqual(exceedsLimit(201), true);
  });
});

describe('recherche', () => {
  const list = [
    { id: '1', name: 'Portable Dell', serialNumber: 'SN-100' },
    { id: '2', name: 'Écran HP', serialNumber: 'SN-200' },
    { id: '3', name: 'Portable HP', serialNumber: 'XY-300' },
  ];

  test('par nom ou numéro de série, sans tenir compte de la casse', () => {
    assert.deepStrictEqual(filterByQuery(list, ' portable ').map((e) => e.id), ['1', '3']);
    assert.deepStrictEqual(filterByQuery(list, 'sn-2').map((e) => e.id), ['2']);
  });

  test('une recherche vide renvoie tout', () => {
    assert.strictEqual(filterByQuery(list, '   ').length, 3);
  });
});

describe('refus et messages', () => {
  test('describeRefusal nomme l’équipement et donne la raison en clair', () => {
    assert.strictEqual(
      describeRefusal({ equipmentId: 'x', name: 'Portable', serialNumber: 'SN-1', reason: 'NOT_AVAILABLE' }),
      'Portable (SN-1) : déjà affecté ou indisponible'
    );
    assert.strictEqual(describeRefusal({ equipmentId: 'abc', reason: 'NOT_FOUND' }), 'abc : équipement introuvable');
  });

  test('parseBulkRefusals lit la réponse serveur et ignore les détails inattendus', () => {
    assert.deepStrictEqual(parseBulkRefusals([{ equipmentId: 'a', reason: 'NOT_FOUND' }, { equipmentId: 'b', reason: 'AUTRE' }]).map((r) => [r.equipmentId, r.reason]), [
      ['a', 'NOT_FOUND'],
      ['b', 'NOT_AVAILABLE'],
    ]);
    assert.deepStrictEqual(parseBulkRefusals(undefined), []);
    assert.deepStrictEqual(parseBulkRefusals([null, 3, { foo: 1 }]), []);
  });

  test('successMessage accorde au singulier et au pluriel', () => {
    assert.strictEqual(successMessage(1), '1 équipement affecté');
    assert.strictEqual(successMessage(12), '12 équipements affectés');
  });
});
