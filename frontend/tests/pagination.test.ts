import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PAGE_SIZE_STORAGE_KEY,
  clampPage,
  isPageSize,
  pageRange,
  pageWindow,
  paginate,
  rangeLabel,
  readStoredPageSize,
  storePageSize,
  totalPages,
} from '../src/utils/pagination.ts';

describe('taille de page mémorisée', () => {
  test('tailles proposées : 10, 25, 50 et 100 ; 25 par défaut', () => {
    assert.deepStrictEqual([...PAGE_SIZES], [10, 25, 50, 100]);
    assert.strictEqual(DEFAULT_PAGE_SIZE, 25);
    assert.strictEqual(isPageSize(50), true);
    assert.strictEqual(isPageSize(30), false);
    assert.strictEqual(isPageSize('50'), false);
  });

  test('relit la valeur mémorisée, sinon la valeur par défaut', () => {
    const storageWith = (value: string | null) => ({ getItem: () => value });
    assert.strictEqual(readStoredPageSize(storageWith('50')), 50);
    assert.strictEqual(readStoredPageSize(storageWith(null)), 25);
    assert.strictEqual(readStoredPageSize(null), 25);
  });

  test('une valeur corrompue ou non proposée donne la valeur par défaut', () => {
    for (const bad of ['abc', '', '0', '-10', '30', '1000', 'NaN', '50abc']) {
      assert.strictEqual(readStoredPageSize({ getItem: () => bad }), 25, bad);
    }
  });

  test('un stockage qui lève une exception ne casse rien', () => {
    const failing = {
      getItem: () => {
        throw new Error('refusé');
      },
      setItem: () => {
        throw new Error('refusé');
      },
    };
    assert.strictEqual(readStoredPageSize(failing), 25);
    assert.doesNotThrow(() => storePageSize(50, failing));
  });

  test("n'enregistre que les tailles proposées", () => {
    const saved: [string, string][] = [];
    const storage = { setItem: (key: string, value: string) => void saved.push([key, value]) };
    storePageSize(50, storage);
    storePageSize(30, storage);
    assert.deepStrictEqual(saved, [[PAGE_SIZE_STORAGE_KEY, '50']]);
  });
});

describe('bornage et plage affichée', () => {
  test('nombre de pages', () => {
    assert.strictEqual(totalPages(612, 25), 25);
    assert.strictEqual(totalPages(25, 25), 1);
    assert.strictEqual(totalPages(26, 25), 2);
    assert.strictEqual(totalPages(0, 25), 0);
  });

  test('page ramenée dans les limites', () => {
    assert.strictEqual(clampPage(99, 612, 25), 25);
    assert.strictEqual(clampPage(0, 612, 25), 1);
    assert.strictEqual(clampPage(-3, 612, 25), 1);
    assert.strictEqual(clampPage(3, 0, 25), 1);
    assert.strictEqual(clampPage(Number.NaN, 612, 25), 1);
    assert.strictEqual(clampPage(2.9, 612, 25), 2);
  });

  test('plage « x à y sur N »', () => {
    assert.strictEqual(rangeLabel(2, 25, 612), '26 à 50 sur 612');
    assert.strictEqual(rangeLabel(1, 25, 612), '1 à 25 sur 612');
    assert.strictEqual(rangeLabel(25, 25, 612), '601 à 612 sur 612');
    assert.strictEqual(rangeLabel(1, 25, 7), '1 à 7 sur 7');
    assert.strictEqual(rangeLabel(1, 25, 0), '0 résultat');
    assert.deepStrictEqual(pageRange(99, 25, 612), { from: 601, to: 612 });
    assert.deepStrictEqual(pageRange(1, 25, 0), { from: 0, to: 0 });
  });

  test('découpe une liste et borne la page', () => {
    const items = Array.from({ length: 53 }, (_, i) => i + 1);
    assert.deepStrictEqual(paginate(items, 1, 25), items.slice(0, 25));
    assert.deepStrictEqual(paginate(items, 3, 25), [51, 52, 53]);
    assert.deepStrictEqual(paginate(items, 9, 25), [51, 52, 53]);
    assert.deepStrictEqual(paginate([], 1, 25), []);
  });
});

describe('numéros de page affichés', () => {
  test('liste vide : aucun numéro ; une page : [1]', () => {
    assert.deepStrictEqual(pageWindow(1, 0), []);
    assert.deepStrictEqual(pageWindow(1, 1), [1]);
  });

  test('jusqu à 7 pages : toutes', () => {
    assert.deepStrictEqual(pageWindow(4, 7), [1, 2, 3, 4, 5, 6, 7]);
  });

  test('25 pages : début, milieu et fin', () => {
    assert.deepStrictEqual(pageWindow(1, 25), [1, 2, 3, 4, 5, 'ellipsis-end', 25]);
    assert.deepStrictEqual(pageWindow(4, 25), [1, 2, 3, 4, 5, 'ellipsis-end', 25]);
    assert.deepStrictEqual(pageWindow(12, 25), [1, 'ellipsis-start', 11, 12, 13, 'ellipsis-end', 25]);
    assert.deepStrictEqual(pageWindow(22, 25), [1, 'ellipsis-start', 21, 22, 23, 24, 25]);
    assert.deepStrictEqual(pageWindow(25, 25), [1, 'ellipsis-start', 21, 22, 23, 24, 25]);
  });

  test('la page courante apparaît toujours et il y a au plus 7 éléments', () => {
    for (let pages = 1; pages <= 30; pages++) {
      for (let page = 1; page <= pages; page++) {
        const window = pageWindow(page, pages);
        assert.ok(window.includes(page), `${page}/${pages}`);
        assert.ok(window.length <= 7, `${page}/${pages}`);
        assert.ok(window.includes(1) && window.includes(pages));
      }
    }
  });
});
