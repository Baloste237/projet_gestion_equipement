import assert from 'node:assert';
import { test, describe } from 'node:test';
import { checkRouteAccess } from '../src/utils/routeGuards';

describe("Contrôle d'accès aux routes (checkRouteAccess)", () => {
  test('bloque l’accès si aucun token n’est présent (UNAUTHENTICATED)', () => {
    assert.deepStrictEqual(checkRouteAccess(null, 'ADMIN'), {
      allowed: false,
      reason: 'UNAUTHENTICATED',
    });
    assert.deepStrictEqual(checkRouteAccess('', 'ADMIN'), {
      allowed: false,
      reason: 'UNAUTHENTICATED',
    });
    assert.deepStrictEqual(checkRouteAccess(undefined, 'EMPLOYE'), {
      allowed: false,
      reason: 'UNAUTHENTICATED',
    });
  });

  test('autorise l’accès si token présent et aucune restriction de rôle', () => {
    assert.deepStrictEqual(checkRouteAccess('valid-token', 'EMPLOYE'), {
      allowed: true,
    });
    assert.deepStrictEqual(checkRouteAccess('valid-token', 'AUDITEUR', []), {
      allowed: true,
    });
  });

  test('autorise l’accès si le rôle de l’utilisateur figure dans allowedRoles', () => {
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'ADMIN', ['ADMIN', 'RESPONSABLE']),
      { allowed: true }
    );
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'RESPONSABLE', ['ADMIN', 'RESPONSABLE']),
      { allowed: true }
    );
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'AUDITEUR', ['ADMIN', 'RESPONSABLE', 'AUDITEUR']),
      { allowed: true }
    );
  });

  test('bloque l’accès (UNAUTHORIZED) si le rôle n’a pas les privilèges requis', () => {
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'EMPLOYE', ['ADMIN', 'RESPONSABLE']),
      {
        allowed: false,
        reason: 'UNAUTHORIZED',
      }
    );
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'AUDITEUR', ['ADMIN']),
      {
        allowed: false,
        reason: 'UNAUTHORIZED',
      }
    );
  });

  test('gère la casse des rôles et les espaces superflus', () => {
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'admin ', ['ADMIN']),
      { allowed: true }
    );
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', 'ADMIN', [' admin ']),
      { allowed: true }
    );
  });

  test('attribue le rôle EMPLOYE par défaut si non spécifié', () => {
    // Si la route exige ADMIN et qu'aucun rôle n'est spécifié (null ou ''), c'est refusé
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', null, ['ADMIN']),
      {
        allowed: false,
        reason: 'UNAUTHORIZED',
      }
    );
    // Si la route accepte EMPLOYE, c'est autorisé
    assert.deepStrictEqual(
      checkRouteAccess('valid-token', null, ['EMPLOYE']),
      { allowed: true }
    );
  });
});
