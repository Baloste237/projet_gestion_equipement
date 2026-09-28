import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  assigneeSearchText,
  canTransfer,
  describeAssignee,
  UNAVAILABLE_ASSIGNEE_LABEL,
} from '../src/utils/assignee.ts';

describe('describeAssignee', () => {
  test('utilisateur : nom complet, département en sous-titre, avatar', () => {
    const display = describeAssignee({
      assigneeType: 'USER',
      assignee: { id: 'u1', firstName: 'Awa', lastName: 'Diallo', email: 'awa@x.com', avatarUrl: '/a.png', department: { id: 'd', name: 'IT' } },
    });
    assert.deepStrictEqual(
      [display.name, display.subtitle, display.typeLabel, display.avatarUrl, display.available],
      ['Awa Diallo', 'IT', 'Utilisateur', '/a.png', true]
    );
  });

  test('utilisateur sans nom : retombe sur l’e-mail', () => {
    const display = describeAssignee({ assigneeType: 'USER', assignee: { id: 'u1', email: 'awa@x.com' } });
    assert.strictEqual(display.name, 'awa@x.com');
  });

  test('département : nom du département et type affichés, pas un nom d’utilisateur générique', () => {
    const display = describeAssignee({ assigneeType: 'DEPARTMENT', assignee: { id: 'd1', name: 'Finance' } });
    assert.deepStrictEqual([display.name, display.subtitle, display.typeLabel, display.icon], ['Finance', 'Département', 'Département', 'lan']);
  });

  test('poste : nom du poste et département en sous-titre', () => {
    const display = describeAssignee({
      assigneeType: 'POSITION',
      assignee: { id: 'p1', name: 'Technicien réseau', department: { id: 'd1', name: 'IT' } },
    });
    assert.deepStrictEqual([display.name, display.subtitle, display.typeLabel], ['Technicien réseau', 'IT', 'Poste']);
  });

  test('bénéficiaire introuvable : libellé explicite et type conservé, sans lever d’erreur', () => {
    for (const assigneeType of ['USER', 'DEPARTMENT', 'POSITION'] as const) {
      const display = describeAssignee({ assigneeType, assignee: null });
      assert.strictEqual(display.name, UNAVAILABLE_ASSIGNEE_LABEL);
      assert.strictEqual(display.available, false);
    }
  });

  test('ancienne réponse sans assignee : lit user pour un utilisateur', () => {
    const display = describeAssignee({
      assigneeType: 'USER',
      user: { id: 'u1', firstName: 'Awa', lastName: 'Diallo', email: 'a@x.com', role: 'EMPLOYE' },
    });
    assert.strictEqual(display.name, 'Awa Diallo');
  });

  test('type absent (ancienne réponse) : traité comme un utilisateur', () => {
    const display = describeAssignee({ assigneeType: undefined as never, assignee: null });
    assert.strictEqual(display.type, 'USER');
  });
});

describe('assigneeSearchText', () => {
  test('permet de retrouver par nom, département, type ou e-mail', () => {
    const text = assigneeSearchText({
      assigneeType: 'POSITION',
      assignee: { id: 'p1', name: 'Technicien réseau', department: { id: 'd1', name: 'IT' } },
    });
    for (const term of ['technicien', 'it', 'poste']) assert.ok(text.includes(term), term);
    const userText = assigneeSearchText({ assigneeType: 'USER', assignee: { id: 'u', firstName: 'A', lastName: 'B', email: 'ab@x.com' } });
    assert.ok(userText.includes('ab@x.com'));
  });
});

describe('canTransfer', () => {
  test('seule une affectation active à un utilisateur se transfère', () => {
    assert.strictEqual(canTransfer({ assigneeType: 'USER', status: 'ACTIVE' }), true);
    assert.strictEqual(canTransfer({ assigneeType: 'DEPARTMENT', status: 'ACTIVE' }), false);
    assert.strictEqual(canTransfer({ assigneeType: 'POSITION', status: 'ACTIVE' }), false);
    assert.strictEqual(canTransfer({ assigneeType: 'USER', status: 'RETURNED' }), false);
  });
});
