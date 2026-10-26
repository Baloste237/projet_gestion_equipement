import assert from 'node:assert';
import { test, describe } from 'node:test';
import { categoryErrorMessage } from '../src/utils/categoryErrors';
import { isAdminUser } from '../src/utils/session';

const failure = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } });

describe("rôle de l'utilisateur connecté", () => {
  test('reconnaît un administrateur', () => {
    assert.strictEqual(isAdminUser(JSON.stringify({ role: 'ADMIN' })), true);
  });

  test('refuse les autres rôles', () => {
    for (const role of ['EMPLOYE', 'RESPONSABLE', 'AUDITEUR']) {
      assert.strictEqual(isAdminUser(JSON.stringify({ role })), false, role);
    }
  });

  test('refuse une valeur absente ou illisible', () => {
    assert.strictEqual(isAdminUser(null), false);
    assert.strictEqual(isAdminUser(undefined), false);
    assert.strictEqual(isAdminUser(''), false);
    assert.strictEqual(isAdminUser('pas du json'), false);
  });
});

describe("messages d'erreur de la gestion des catégories", () => {
  test('refus de droits (403)', () => {
    assert.match(categoryErrorMessage(failure(403, { message: 'Accès refusé' }), 'défaut'), /réservée aux administrateurs/);
  });

  test('catégorie utilisée (409) : message du serveur avec le nombre', () => {
    const message = 'Cette catégorie est utilisée par 3 équipements et ne peut pas être supprimée';
    assert.strictEqual(categoryErrorMessage(failure(409, { message }), 'défaut'), message);
  });

  test('nom déjà pris (409) : message du serveur', () => {
    const message = 'Une catégorie nommée « Laptop » existe déjà';
    assert.strictEqual(categoryErrorMessage(failure(409, { message }), 'défaut'), message);
  });

  test('sans message : texte par défaut', () => {
    assert.strictEqual(categoryErrorMessage(failure(500), 'Impossible de supprimer'), 'Impossible de supprimer');
  });
});
