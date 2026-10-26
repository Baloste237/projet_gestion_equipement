import assert from 'node:assert';
import { test, describe } from 'node:test';
import { accountErrorMessage } from '../src/utils/accountErrors';

const failure = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } });

describe("messages d'erreur de la gestion des comptes", () => {
  test('dernier administrateur (409)', () => {
    assert.match(accountErrorMessage(failure(409, { code: 'LAST_ADMIN', message: 'x' }), 'défaut'), /au moins un administrateur actif/);
  });

  test("synchronisation impossible (502) : rien n'a été modifié", () => {
    assert.match(accountErrorMessage(failure(502, { code: 'AUTH_SERVICE_UNAVAILABLE' }), 'défaut'), /rien n'a été modifié/);
  });

  test('refus réservé aux administrateurs (403)', () => {
    assert.match(accountErrorMessage(failure(403, { message: 'Accès refusé' }), 'défaut'), /réservée aux administrateurs/);
  });

  test('compte déjà relié à une autre fiche (409)', () => {
    assert.match(accountErrorMessage(failure(409, { code: 'ACCOUNT_ALREADY_LINKED' }), 'défaut'), /déjà relié à une autre fiche/);
  });

  test('autres erreurs : message du serveur, sinon texte par défaut', () => {
    assert.strictEqual(accountErrorMessage(failure(400, { message: 'Email invalide' }), 'défaut'), 'Email invalide');
    assert.strictEqual(accountErrorMessage(failure(400, { error: { message: 'Détail' } }), 'défaut'), 'Détail');
    assert.strictEqual(accountErrorMessage(failure(500), 'défaut'), 'défaut');
    assert.strictEqual(accountErrorMessage(new Error('réseau'), 'défaut'), 'défaut');
    assert.strictEqual(accountErrorMessage(null, 'défaut'), 'défaut');
  });
});
