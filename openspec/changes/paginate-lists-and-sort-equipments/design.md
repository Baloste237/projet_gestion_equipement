# Design

## Context

Constat détaillé dans la proposition. Points techniques qui contraignent l'approche :

- `equipmentRepository.findAll()` et `auditLogRepository.findAll()` sont appelés sans paramètre par de nombreux consommateurs qui ont besoin de la liste **entière** : fenêtres d'affectation, scanner, inventory-service (reconstruction des KPIs), tableau de bord. Leur contrat ne doit pas changer.
- Le gateway transmet déjà le chemin et les paramètres de requête (`pathRewrite` préfixe le chemin et conserve la chaîne de requête) ; à confirmer par un test de bout en bout.
- Les réponses ont la forme `{ success, data }` ; les erreurs de validation passent par `HttpError` (equipment-service) et `AppError` (audit-service).
- La page d'audit calcule ses compteurs et ses filtres sur la liste entière, et se rafraîchit toutes les 5 secondes ; `auditLogService.getAll` crée des journaux d'exemple quand la table est vide.
- La page des équipements filtre dans le navigateur (recherche, catégorie, statut lu dans l'URL `?status=` depuis le tableau de bord) et gère une sélection multiple dont `pruneSelection` retire les identifiants absents de la liste chargée.
- Un import crée ses équipements en une transaction : même `createdAt` pour toute la fournée.
- Conventions du projet : Prisma 7, tests `node:test` avec base simulée puis vérification sur base jetable, utilitaires frontend purs testés sans navigateur.

## Goals / Non-Goals

**Goals :**
- Parcourir équipements et journal d'audit page par page sans les charger en entier, avec un contrat optionnel qui ne casse aucun appel existant.
- Tri par quatre dates et période en jj/mm/AAAA sur les équipements, ordre stable.
- Même composant de pagination pour les six listes retenues.

**Non-Goals :**
- Pagination des départements, du tableau de bord, des étiquettes et des inventaires ; export (déjà côté serveur) ; pagination « curseur » ; index de tri sur les équipements (620 à 5 000 lignes : inutile) ; refonte de la création des journaux d'exemple ; persistance des filtres dans l'URL (seul `?status=` existe déjà et est conservé).

## Decisions

1. **Pagination optionnelle, détectée par la présence de `page` ou `pageSize`.** Un module partagé de lecture des paramètres (`pagination.ts`, une copie par service, comme `security.ts`) renvoie `null` quand aucun des deux n'est présent (liste complète, format actuel) ; sinon `{ page, pageSize, skip, take }` avec `page ≥ 1` et `1 ≤ pageSize ≤ 100` (défaut 25), ou une erreur 400. La réponse paginée est `{ success, data, meta: { total, page, pageSize, totalPages } }`. *Alternative écartée :* changer `GET /equipments` pour paginer toujours (casse inventory-service, scanner et fenêtres d'affectation).
2. **Équipements : un seul constructeur de requête.** `where` combine `q` (nom, numéro de série ou nom de catégorie, `contains` insensible à la casse), `categoryId`, `status` et la période ; `orderBy` est `[{ <champ>: { sort, nulls: "last" } }, { id: "asc" }]`. `findMany` et `count` partagent le même `where` et s'exécutent dans une transaction de lecture pour que `total` et `data` concordent. Le tri par défaut s'applique aussi à l'appel non paginé (tri stable pour tous). *Alternative écartée :* tri en mémoire côté service (charge toute la table).
3. **Départage par `id`.** Indispensable : tous les équipements d'un import ont le même `createdAt`. L'ordre au sein d'un lot est donc celui des identifiants (aléatoires mais stables), non celui du fichier ; accepté.
4. **Période : bornes sur la date de tri, exclusion des valeurs nulles.** `from` et `to` acceptent `AAAA-MM-JJ` (journée UTC entière, `to` inclus jusqu'à 23:59:59.999) ou une date-heure ISO. Le frontend convertit : pour `createdAt` et `updatedAt` (horodatages), la journée **locale** saisie devient une date-heure ISO ; pour `purchaseDate` et `commissionedAt` (dates sans heure, enregistrées à minuit UTC), il envoie `AAAA-MM-JJ`. Cela évite qu'un équipement ajouté à 00h30 heure locale tombe dans la journée UTC précédente. `from > to` : 400 côté serveur et message côté interface.
5. **Un seul sélecteur de date pour le tri et la période**, comme décidé ; les en-têtes de colonnes de date (« Ajouté le », puis l'éventuelle colonne du champ choisi) changent le champ et le sens.
6. **Saisie jj/mm/AAAA : champ texte à masque, pas `type="date"`.** Le format d'un `type="date"` suit la langue du navigateur, ce qui ne garantit pas jj/mm/AAAA. Un utilitaire pur (`dateFr.ts`) formate, applique le masque à la frappe, analyse (jour, mois, années bissextiles) et convertit en `AAAA-MM-JJ` ou en date-heure locale ; testé sans navigateur. *Alternative écartée :* bibliothèque de sélecteur de date (dépendance et format non garanti).
7. **Audit : filtres et `summary` côté serveur.** `where` reprend les trois règles actuelles du navigateur (acteur ou identifiant ou id de journal en `contains` insensible à la casse ; catégorie par groupes d'actions `contains` ; jour UTC) ; `orderBy` est `[{ createdAt: "desc" }, { id: "desc" }]`. `summary` fait quatre `count` sans filtre (`total`, `authCount`, `mutationCount`, `failedCount`, ce dernier avec `action contains FAILED` ou `metadata` à `status = FAILED` / `success = false`), calculés en parallèle avec la page ; il n'est pas mis en cache à ces volumes. Migration : `@@index([createdAt])` sur `AuditLog`.
8. **Journaux d'exemple.** `getAll` ne les crée que pour l'appel **sans paramètre** sur une table **entièrement vide** ; les appels paginés ou filtrés ne créent jamais rien (sinon un filtre sans résultat fabriquerait des journaux). Le comportement lui-même est préexistant et laissé tel quel.
9. **Frontend : un seul composant et deux modes.** `Pagination` (barre : précédent, suivant, fenêtre de numéros avec points de suspension, « x à y sur N », taille de page) et `utils/pagination.ts` (fenêtre de numéros, bornage de la page, découpe) servent les deux modes : navigateur (`slice` de la liste filtrée) pour affectations, catégories, utilisateurs et postes ; serveur pour équipements et audit (la page et la taille deviennent des paramètres, `meta` pilote la barre). La taille de page est mémorisée dans `localStorage` (clé unique, valeur validée, lecture protégée).
10. **Équipements : recherche avec délai.** Les filtres du serveur sont rechargés après une courte attente de frappe (300 ms) et les réponses obsolètes sont ignorées (la dernière requête gagne), pour éviter la rafale d'appels et l'affichage d'un résultat périmé.
11. **Sélection multiple.** `selectAllSelectable` ne reçoit que la page courante ; la sélection (un ensemble d'identifiants) est conservée entre les pages, donc `pruneSelection` ne retire plus d'identifiants à chaque chargement ; seuls ceux qu'une action vient de traiter ou que le serveur refuse (déjà géré : 409 avec la liste) sont retirés. La limite de 200 et son avertissement sont conservés ; l'assistant d'affectation reçoit toujours `preselectedEquipmentIds`.
12. **Audit : actualisation périodique.** Le rafraîchissement de 5 secondes recharge la page et les filtres courants (silencieusement) sans réinitialiser la page ; il se suspend pendant la saisie d'un filtre.

## Risks / Trade-offs

- **[Deux modes de pagination à maintenir]** → un seul composant et des utilitaires purs communs ; la répartition est documentée et testée.
- **[Un client existant envoie `page` par habitude]** → seuls deux endpoints le reconnaissent et le comportement sans paramètre est inchangé ; documenté dans Swagger.
- **[`count` + `findMany` : total légèrement décalé si des écritures surviennent entre les deux]** → lecture dans une même transaction ; l'interface ramène la page dans les limites.
- **[Tri `nulls: "last"` non pris en charge par la version de Prisma ou de PostgreSQL]** → vérifié par un test sur base jetable avant de s'y appuyer ; repli : deux ordres (valeur non nulle puis nulle) via `orderBy` brut.
- **[Fuseau horaire des périodes]** → décision 4 ; limite documentée : les dates sans heure sont comparées en UTC.
- **[Rafraîchissement de l'audit toutes les 5 s et limite de 300 requêtes par 15 minutes et par IP]** → inchangé (une requête par rafraîchissement, comme aujourd'hui) ; la page paginée est plus légère.
- **[Sélection conservée entre pages : des identifiants peuvent devenir invalides (équipement affecté entre-temps)]** → le serveur refuse déjà l'affectation groupée avec le détail par équipement ; le message est affiché.
- **[Changement du tri par défaut de la liste non paginée]** → ordre jusqu'ici non défini : aucun consommateur n'en dépendait ; test de non-régression sur inventory-service.

## Migration Plan

Migration d'index sur `AuditLog.createdAt` appliquée au démarrage du conteneur (`prisma migrate deploy`) ou à la main en local. Aucune donnée modifiée ; déploiement par reconstruction des images equipment-service, audit-service et frontend. Retour arrière : revenir au commit précédent ; l'index peut rester sans effet.

## Open Questions

- Faut-il, plus tard, conserver page, tri et période dans l'URL pour pouvoir partager ou retrouver une vue ? Sans effet sur ces specs (ajout d'une lecture et d'une écriture des paramètres).
