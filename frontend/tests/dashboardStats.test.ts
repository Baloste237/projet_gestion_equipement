import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  NO_DEPARTMENT_LABEL,
  OTHERS_LABEL,
  UNKNOWN_DEPARTMENT_LABEL,
  bucketSizeDays,
  buildAssignmentTrend,
  departmentOfAssignment,
  groupAssignmentsByDepartment,
  percentOf,
} from '../src/utils/dashboardStats.ts';

type Row = Parameters<typeof groupAssignmentsByDepartment>[0][number];

const dept = (name: string, status: Row['status'] = 'ACTIVE'): Row => ({
  status,
  assigneeType: 'DEPARTMENT',
  assignee: { id: name, name },
});
const user = (department: string | null, status: Row['status'] = 'ACTIVE'): Row => ({
  status,
  assigneeType: 'USER',
  assignee: { id: 'u', firstName: 'A', lastName: 'B', department: department ? { id: 'd', name: department } : undefined },
});
const position = (department: string | null, status: Row['status'] = 'ACTIVE'): Row => ({
  status,
  assigneeType: 'POSITION',
  assignee: { id: 'p', name: 'Poste', department: department ? { id: 'd', name: department } : null },
});

describe('percentOf', () => {
  test('arrondit, et renvoie 0 quand le total est nul', () => {
    assert.strictEqual(percentOf(1, 3), 33);
    assert.strictEqual(percentOf(2, 3), 67);
    assert.strictEqual(percentOf(5, 0), 0);
  });
});

describe('departmentOfAssignment', () => {
  test('utilise le département selon le type de bénéficiaire', () => {
    assert.strictEqual(departmentOfAssignment(dept('Finance')), 'Finance');
    assert.strictEqual(departmentOfAssignment(user('IT')), 'IT');
    assert.strictEqual(departmentOfAssignment(position('RH')), 'RH');
  });

  test('cas dégradés : utilisateur sans département, poste sans département, bénéficiaire introuvable', () => {
    assert.strictEqual(departmentOfAssignment(user(null)), NO_DEPARTMENT_LABEL);
    assert.strictEqual(departmentOfAssignment(position(null)), UNKNOWN_DEPARTMENT_LABEL);
    assert.strictEqual(departmentOfAssignment({ assigneeType: 'DEPARTMENT', assignee: null }), UNKNOWN_DEPARTMENT_LABEL);
  });
});

describe('groupAssignmentsByDepartment', () => {
  test('compte les équipements affectés par département, du plus au moins doté', () => {
    const rows = groupAssignmentsByDepartment([dept('IT'), user('IT'), position('IT'), dept('RH'), user('Finance'), user('Finance')]);
    assert.deepStrictEqual(rows, [
      { label: 'IT', count: 3 },
      { label: 'Finance', count: 2 },
      { label: 'RH', count: 1 },
    ]);
  });

  test('ignore les affectations transférées ou restituées', () => {
    const rows = groupAssignmentsByDepartment([dept('IT'), dept('IT', 'RETURNED'), dept('IT', 'TRANSFERRED')]);
    assert.deepStrictEqual(rows, [{ label: 'IT', count: 1 }]);
  });

  test('regroupe le reste dans « Autres » au-delà de la limite, sans perdre d’équipement', () => {
    const input: Row[] = [];
    for (let i = 1; i <= 10; i++) for (let n = 0; n < i; n++) input.push(dept(`D${String(i).padStart(2, '0')}`));
    const rows = groupAssignmentsByDepartment(input, 8);
    assert.strictEqual(rows.length, 9);
    assert.deepStrictEqual(rows[0], { label: 'D10', count: 10 });
    assert.deepStrictEqual(rows[8], { label: OTHERS_LABEL, count: 1 + 2 });
    assert.strictEqual(rows.reduce((s, r) => s + r.count, 0), 55);
  });

  test('aucune affectation : liste vide (état vide à afficher, pas des zéros)', () => {
    assert.deepStrictEqual(groupAssignmentsByDepartment([]), []);
  });
});

describe('buildAssignmentTrend', () => {
  const now = new Date('2026-09-28T15:00:00Z');
  const asg = (assignedAt: string, returnDate?: string) => ({
    assignedAt,
    returnInfo: returnDate ? { id: 'r', condition: 'GOOD' as const, returnDate } : null,
  });

  test('30 jours : un bucket par jour, le dernier est aujourd’hui', () => {
    const buckets = buildAssignmentTrend([], 30, now);
    assert.strictEqual(bucketSizeDays(30), 1);
    assert.strictEqual(buckets.length, 30);
    assert.strictEqual(buckets[29].label, '28/09');
    assert.strictEqual(buckets[0].label, '30/08');
  });

  test('compte les affectations créées et les restitutions dans le bon jour', () => {
    const buckets = buildAssignmentTrend(
      [
        asg('2026-09-28T08:00:00Z'),
        asg('2026-09-28T23:59:00Z', '2026-09-27T10:00:00Z'),
        asg('2026-09-01T00:00:00Z', '2026-09-28T09:00:00Z'),
      ],
      30,
      now
    );
    assert.deepStrictEqual([buckets[29].created, buckets[29].returned], [2, 1]);
    assert.deepStrictEqual([buckets[28].created, buckets[28].returned], [0, 1]);
    assert.strictEqual(buckets[2].label, "01/09");
    assert.strictEqual(buckets[2].created, 1);
  });

  test('ignore ce qui est hors période ou invalide', () => {
    const buckets = buildAssignmentTrend(
      [asg('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'), asg('pas une date'), asg('2026-09-29T00:00:00Z')],
      7,
      now
    );
    assert.strictEqual(buckets.length, 7);
    assert.strictEqual(buckets.reduce((s, b) => s + b.created + b.returned, 0), 0);
  });

  test('90 jours et 12 mois : regroupement par semaine', () => {
    assert.strictEqual(bucketSizeDays(90), 7);
    const ninety = buildAssignmentTrend([asg('2026-09-28T08:00:00Z')], 90, now);
    assert.strictEqual(ninety.length, 13);
    assert.strictEqual(ninety[12].created, 1);
    assert.match(ninety[12].fullLabel, / au /);
    assert.strictEqual(buildAssignmentTrend([], 365, now).length, 53);
  });

  test('aucune donnée : des buckets à zéro (le composant affiche l’état vide)', () => {
    const buckets = buildAssignmentTrend([], 7, now);
    assert.ok(buckets.every((b) => b.created === 0 && b.returned === 0));
  });
});
