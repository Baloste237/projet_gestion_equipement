import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  conditionLabel,
  formatServiceDate,
  toDateInputValue,
  validateServiceDates,
} from '../src/utils/equipmentLifecycle.ts';
import {
  IMPORT_FIELD_LABELS,
  UNASSIGNED_REASON_LABELS,
  fieldLabel,
  unassignedReasonLabel,
} from '../src/utils/importMapping.ts';

describe('État de fonctionnement et dates de service', () => {
  test("libellés de l'état, fonctionnel par défaut", () => {
    assert.strictEqual(conditionLabel('FONCTIONNEL'), 'Fonctionnel');
    assert.strictEqual(conditionLabel('NON_FONCTIONNEL'), 'Non fonctionnel');
    assert.strictEqual(conditionLabel(undefined), 'Fonctionnel');
  });

  test('convertit une date ISO en valeur de champ date', () => {
    assert.strictEqual(toDateInputValue('2024-03-15T00:00:00.000Z'), '2024-03-15');
    assert.strictEqual(toDateInputValue(null), '');
  });

  test('refuse une mise hors service antérieure à la mise en service', () => {
    assert.match(validateServiceDates('2025-06-30', '2024-01-10')!, /ne peut pas précéder/);
    assert.strictEqual(validateServiceDates('2024-01-10', '2025-06-30'), null);
    assert.strictEqual(validateServiceDates('2024-01-10', '2024-01-10'), null);
    assert.strictEqual(validateServiceDates('', '2024-01-10'), null);
    assert.strictEqual(validateServiceDates('2024-01-10', ''), null);
  });

  test("affiche une date de service, ou un tiret quand elle est absente", () => {
    assert.strictEqual(formatServiceDate('2024-03-15T00:00:00.000Z'), '15/03/2024');
    assert.strictEqual(formatServiceDate(null), '—');
  });
});

describe("Nouveaux champs de l'import", () => {
  test('les quatre champs sont proposés dans le mapping', () => {
    for (const field of ['condition', 'commissionedAt', 'decommissionedAt', 'assigneeName']) {
      assert.ok(IMPORT_FIELD_LABELS[field], field);
    }
    assert.strictEqual(fieldLabel('assigneeName'), 'Mis à la disposition de');
  });

  test('chaque raison de non-affectation a un libellé en français', () => {
    assert.strictEqual(Object.keys(UNASSIGNED_REASON_LABELS).length, 6);
    assert.strictEqual(unassignedReasonLabel('USER_NOT_FOUND'), 'Utilisateur introuvable');
    assert.match(unassignedReasonLabel('USER_AMBIGUOUS'), /Plusieurs utilisateurs/);
    assert.match(unassignedReasonLabel('EQUIPMENT_TO_COMPLETE'), /à compléter/);
    // Une raison inconnue est affichée telle quelle plutôt que de casser l'écran
    assert.strictEqual(unassignedReasonLabel('AUTRE'), 'AUTRE');
  });
});
