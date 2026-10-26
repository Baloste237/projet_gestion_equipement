import assert from 'node:assert';
import { test, describe } from 'node:test';
import { LABELS_STORAGE_KEY, loadLabelIds, pickForLabels, saveLabelIds } from '../src/utils/labelSelection.ts';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
};

describe('Sélection pour les étiquettes', () => {
  test('conserve la liste sans doublon et la relit', () => {
    const storage = memoryStorage();
    saveLabelIds(storage, ['a', 'b', 'a']);
    assert.deepStrictEqual(loadLabelIds(storage), ['a', 'b']);
  });

  test('une liste de milliers d\'identifiants est conservée en entier', () => {
    const storage = memoryStorage();
    const ids = Array.from({ length: 5000 }, (_, i) => `id-${i}`);
    saveLabelIds(storage, ids);
    assert.strictEqual(loadLabelIds(storage).length, 5000);
  });

  test('une valeur absente, corrompue ou mal typée donne une liste vide ou filtrée', () => {
    assert.deepStrictEqual(loadLabelIds(memoryStorage()), []);
    assert.deepStrictEqual(loadLabelIds(memoryStorage({ [LABELS_STORAGE_KEY]: 'pas du json' })), []);
    assert.deepStrictEqual(loadLabelIds(memoryStorage({ [LABELS_STORAGE_KEY]: '{"a":1}' })), []);
    assert.deepStrictEqual(loadLabelIds(memoryStorage({ [LABELS_STORAGE_KEY]: '["a", 3, "", null, "b"]' })), ['a', 'b']);
  });

  test('un stockage qui échoue ne casse rien', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqué');
      },
      setItem: () => {
        throw new Error('bloqué');
      },
    };
    assert.doesNotThrow(() => saveLabelIds(broken, ['a']));
    assert.deepStrictEqual(loadLabelIds(broken), []);
  });

  test("garde l'ordre de la liste d'équipements et compte les identifiants inconnus", () => {
    const equipments = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const { picked, missing } = pickForLabels(equipments, ['c', 'a', 'zzz']);
    assert.deepStrictEqual(picked.map((e) => e.id), ['a', 'c']);
    assert.strictEqual(missing, 1);
  });
});
