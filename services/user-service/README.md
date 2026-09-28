# user-service

Gestion des utilisateurs, des départements et des postes de travail (port `4002`, préfixe `/api`).
La documentation OpenAPI est servie sur `/api-docs`.

## Postes (`/api/positions`)

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/positions?departmentId=` | Lister les postes, filtre facultatif par département |
| `GET` | `/api/positions/:id` | Consulter un poste avec son département |
| `POST` | `/api/positions` | Créer un poste (`name` ≥ 2 caractères, `departmentId`) |
| `PATCH` | `/api/positions/:id` | Modifier nom, description, statut, département |
| `DELETE` | `/api/positions/:id` | Supprimer un poste |

- Le nom d'un poste est unique au sein de son département, sans tenir compte de la casse (`409 POSITION_NAME_CONFLICT`).
- Un département inexistant est refusé (`400 DEPARTMENT_NOT_FOUND`).
- La suppression est refusée (`409 POSITION_HAS_ACTIVE_ASSIGNMENTS`) si le poste a une affectation active.
  Le service interroge pour cela assignment-service (`ASSIGNMENT_SERVICE_URL`) en relayant le jeton de l'appelant.
  Si assignment-service est injoignable, la suppression est refusée aussi (`503 ASSIGNMENT_SERVICE_UNAVAILABLE`).
- La création, la modification et la suppression sont journalisées dans audit-service
  (`POSITION_CREATED`, `POSITION_UPDATED`, `POSITION_DELETED`, envoi HTTP vers `AUDIT_SERVICE_URL`, sans bloquer l'opération en cas d'échec).

## Droits d'accès (état temporaire)

Ces routes **ne contrôlent aucun rôle** : tout utilisateur authentifié peut créer, modifier et supprimer un poste.
L'authentification est assurée uniquement par la gateway, qui vérifie le JWT et transmet `x-user-id` ;
user-service ne doit donc jamais être exposé en dehors de la gateway.
La restriction par rôle sera ajoutée dans un change ultérieur.

## Configuration

Voir `.env.example`. Variables spécifiques : `ASSIGNMENT_SERVICE_URL`, `AUDIT_SERVICE_URL`.

## Tests

```bash
npm test
```
