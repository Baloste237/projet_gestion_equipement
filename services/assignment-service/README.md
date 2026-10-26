# assignment-service

Affectation des équipements à un utilisateur, un département ou un poste (port `4004`, préfixe `/api`).
La documentation OpenAPI est servie sur `/api-docs`.

## Routes principales

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/assignments` | Affecter **un** équipement (contrat inchangé) |
| `POST` | `/api/assignments/bulk` | Affecter de **1 à 200** équipements au même bénéficiaire, tout ou rien |
| `GET` | `/api/assignments?assigneeType=&assigneeId=&status=` | Lister (filtres facultatifs) |
| `GET` | `/api/assignments/:id` | Consulter une affectation |
| `POST` | `/api/assignments/:id/transfer` | Transférer vers un utilisateur |
| `POST` | `/api/assignments/:id/return` | Enregistrer la restitution |

## Affectation groupée

`POST /api/assignments/bulk` avec `{ assigneeType, assigneeId, equipmentIds[], expectedReturnDate?, handoverCondition?, notes? }`.

```
1. bénéficiaire actif ?                      sinon 404/409 (mêmes erreurs qu'une affectation unitaire)
2. chaque équipement existe et est AVAILABLE ?  sinon 409 BULK_ASSIGNMENT_REFUSED + liste (NOT_FOUND | NOT_AVAILABLE)
3. insertion de toutes les affectations en UNE transaction (l'index unique protège de la concurrence)
                                               conflit -> 409 EQUIPMENT_ALREADY_ASSIGNED
4. équipements -> ASSIGNED en un appel groupé (2 tentatives)
                                               échec -> les affectations créées sont supprimées, 503
5. succès seulement : événement assignment.created par affectation + audit ASSIGNMENTS_CREATED
```

- La création unitaire est un cas particulier du même noyau (mêmes garanties, mêmes codes d'erreur historiques : `EQUIPMENT_NOT_FOUND`, `EQUIPMENT_NOT_AVAILABLE`).
- **Audit** : une entrée par opération (auteur = identifiant du jeton, bénéficiaire, liste des équipements et affectations), envoyée en HTTP à audit-service (`AUDIT_SERVICE_URL`), sans jamais bloquer l'affectation.
- **Fenêtre résiduelle** : un arrêt brutal du processus entre l'étape 3 et l'étape 4 laisse des affectations actives sur des équipements encore disponibles. L'index unique empêche toute double affectation ; l'anomalie se repère par requête (affectation `ACTIVE` dont l'équipement n'est pas `ASSIGNED`).
- Droits : tout utilisateur authentifié (état temporaire, voir le README racine).

## Base de données : index unique partiel

Un équipement ne peut avoir qu'**une** affectation `ACTIVE` :

```sql
CREATE UNIQUE INDEX "Assignment_equipmentId_active_key" ON "Assignment"("equipmentId") WHERE "status" = 'ACTIVE';
```

- Prisma ne sait pas exprimer un index partiel : il n'existe que dans la migration `20260928140000_one_active_assignment_per_equipment` (voir le commentaire dans `schema.prisma`).
- **Appliquer les migrations avec `npx prisma migrate deploy`.** Un `migrate dev` pourrait proposer de supprimer cet index.
- La migration **échoue avec la liste des équipements** si certains ont déjà plusieurs affectations actives : les corriger avant de relancer.

## Configuration

Voir `.env.example`. Variables spécifiques : `USER_SERVICE_URL`, `EQUIPMENT_SERVICE_URL`, `AUDIT_SERVICE_URL`.
Les appels groupés vers equipment-service utilisent `POST /equipments/lookup` et `POST /equipments/status/batch`.

## Tests

```bash
npm test
```
