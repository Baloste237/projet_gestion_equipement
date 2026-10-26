# Design

## Context

L'import vit dans equipment-service ([equipment-import.service.ts](../../../services/equipment-service/src/services/import-export/equipment-import.service.ts)) : il lit le fichier, construit des brouillons par le mapper, puis insère tout dans une transaction (tout ou rien) et publie `equipment.created`. Le mapper ne connaît que 13 champs ; les alias d'en-têtes sont dans `DEFAULT_MAPPING`.

Les affectations vivent dans assignment-service, avec sa propre base. Sa route `POST /assignments/bulk` (branche `bulk-assign-equipment`) valide le bénéficiaire, exige que tous les équipements soient AVAILABLE, enregistre en une transaction, passe les équipements à ASSIGNED, et annule en cas d'échec. Elle exige un jeton et la permission `assignment:create`. Les utilisateurs vivent dans user-service (`GET /users` renvoie la liste avec `firstName`, `lastName`, `isActive`).

Voir proposal.md pour la motivation.

## Goals / Non-Goals

**Goals:**
- Lire état, dates de service et bénéficiaire depuis le fichier sans casser les imports existants.
- Réutiliser `POST /assignments/bulk` plutôt que de dupliquer les règles d'affectation.
- Ne jamais perdre un import à cause d'un nom mal saisi.

**Non-Goals:**
- Affecter à un département ou un poste depuis le fichier (utilisateurs uniquement).
- Créer des utilisateurs à la volée.
- Passer automatiquement un équipement au statut retiré selon la date de mise hors service.
- Rejouer plus tard les affectations non résolues.

## Decisions

**1. L'affectation se fait après la transaction d'import, pas dedans.**
Les bases sont séparées, une transaction commune est impossible, et l'affectation exige que l'équipement existe déjà (assignment-service le relit chez equipment-service). Ordre : insertion → résolution des noms → un appel bulk par utilisateur reconnu. Alternative écartée : affecter avant l'insertion, impossible sans identifiants.

**2. Un appel bulk par bénéficiaire distinct.**
Les équipements créés sont regroupés par utilisateur résolu, ce qui donne au plus un appel par personne (limite de 200 équipements par appel : découpage en lots). Un échec d'un lot n'affecte pas les autres ; le bulk étant tout ou rien, un lot refusé laisse ses équipements non affectés et alimente le rapport.

**3. Résolution des noms par une liste d'utilisateurs lue une fois.**
Un seul `GET /users` par import, puis correspondance en mémoire sur une clé normalisée : casse, accents et ponctuation ignorés (même `normalizeHeader` que les en-têtes), mots triés, donc « Mofor Chi George » = « Chi George Mofor ». Zéro correspondance → « introuvable » ; plus d'une → « ambigu » ; utilisateur inactif → « désactivé ». Alternative écartée : recherche côté user-service pour chaque nom, trop d'appels sur 5000 équipements.

**4. Le jeton de l'appelant est transmis à assignment-service.**
L'import est déjà authentifié par la passerelle ; l'en-tête `Authorization` est relayé pour que la permission `assignment:create` soit vérifiée pour la vraie personne et que l'audit garde son identité. Si elle n'a pas ce droit, l'import réussit sans affectation et le rapport le dit. Alternative écartée : jeton de service, il contournerait les droits.

**5. L'état est un champ séparé du statut.**
Colonne `condition` (`FONCTIONNEL` par défaut) plus `commissionedAt` et `decommissionedAt`. Le statut décrit la disponibilité (AVAILABLE, ASSIGNED, A_COMPLETER), l'état décrit le bon fonctionnement ; les mélanger compliquerait les filtres et les règles d'affectation. Un équipement NON_FONCTIONNEL reste affectable : c'est un choix de départ, facile à durcir plus tard.

**6. Rapport d'import étendu, sans changer le contrat existant.**
La réponse garde `createdCount`, `toCompleteCount`, `equipments` et ajoute `assignedCount` et `unassigned: [{ row, assigneeName, reason }]`. `reason` : `USER_NOT_FOUND`, `USER_AMBIGUOUS`, `USER_INACTIVE`, `EQUIPMENT_TO_COMPLETE`, `ASSIGNMENT_REFUSED`, `ASSIGNMENT_UNAVAILABLE`. Le brouillon garde le numéro de ligne d'origine et le nom lu.

**7. L'export lit les bénéficiaires par une route dédiée d'assignment-service.**
`GET /assignments/active-summary` (jeton et permission `assignment:read`) renvoie uniquement `{ equipmentId, assigneeType, assigneeId }` des affectations actives : un seul appel, sans les deux appels HTTP par affectation de `GET /assignments`. equipment-service résout ensuite les noms avec les listes de user-service (utilisateurs, départements, postes), une lecture chacune. Si l'un des services est indisponible, la colonne bénéficiaire reste vide et l'export n'échoue pas. Alternative écartée : `GET /assignments?status=ACTIVE`, trop lent au-delà de quelques centaines d'affectations.

**8. Migration additive.**
Trois colonnes avec valeur par défaut ou nullable : aucune reprise de données, l'ancien code continue de fonctionner.

## Risks / Trade-offs

- [Import réussi mais affectation partielle] → chaque lot est tout ou rien, et le rapport distingue clairement affectés et non affectés ; l'utilisateur peut affecter le reste via l'affectation groupée.
- [Homonymes] → jamais d'affectation sur une correspondance ambiguë, la ligne est signalée.
- [Pannes entre les deux services] → équipements conservés, `ASSIGNMENT_UNAVAILABLE` dans le rapport, rien à annuler côté équipement-service.
- [Liste d'utilisateurs volumineuse] → une seule lecture par import, acceptable pour l'échelle actuelle ; à paginer si `GET /users` le devient.
- [Statut A_COMPLETER non affectable] → une ligne sans numéro de série ne sera pas affectée tant qu'elle n'est pas complétée ; c'est signalé et voulu, car le bulk exige AVAILABLE.
