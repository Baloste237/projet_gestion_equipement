# Design

## Context

Voir `proposal.md` pour la motivation. État observé :

- **Backend déjà en place** : `POST /equipments/import`, `GET /equipments/export`, affectation polymorphique (`assigneeType`/`assigneeId`, réponse enrichie avec `assignee`), `GET /dashboard/kpis` et `POST /dashboard/kpis/rebuild` (inventory-service, aujourd'hui réservé à ADMIN par `requireRole`), `GET /positions[/:id]` (lecture seule). Les KPIs fournissent statut, catégorie et type de bénéficiaire, mais ni département ni série temporelle.
- **user-service n'a aucune couche d'authentification ni d'audit** : ni `jsonwebtoken`, ni `amqplib`, ni middleware de rôle. Il fait confiance au gateway, qui vérifie le JWT et transmet `x-user-id` et `x-user-role`. Les routes départements sont donc ouvertes à tout utilisateur authentifié.
- **Contrôles de rôle déjà présents** : assignment-service (`assignment:create/read/transfer/return`), inventory-service (`inventory:create/validate`, `requireRole("ADMIN")` sur `rebuild`), audit-service (`audit:read`). Les permissions viennent du JWT, construit par `ROLE_PERMISSIONS` dans auth-service, où EMPLOYE n'a que la lecture.
- **Le service d'affectation** ne sait pas filtrer par bénéficiaire : `GET /assignments` renvoie tout.
- **Frontend** : React + Tailwind, sans librairie de graphiques ; `equipmentService.getAll()` est appelé partout et le tableau de bord recalcule ses chiffres côté client, avec un sélecteur de période et une liste d'affectations déjà chargée. Aucun outil de lecture de tableur côté navigateur.
- Le dossier `frontend/` n'est pas suivi par Git.

## Goals / Non-Goals

**Goals:**
- Rendre visibles dans l'interface les capacités déjà présentes côté API, avec le minimum de nouvelles routes backend.
- Ajouter le CRUD des postes en réutilisant les conventions des départements (validators zod, couches Controller / Service / Repository).
- Ne pas casser les clients existants (payload `{ userId }`, réponses de listes).
- Donner à tous les utilisateurs authentifiés les mêmes droits, de façon centralisée et facile à re-séparer plus tard.
- Fournir des diagrammes réellement utiles à l'analyse (comparaison, répartition, tendance), lisibles et interactifs.

**Non-Goals:**
- Séparation des fonctionnalités par rôle : reportée à un change ultérieur.
- Transfert d'une affectation vers un département ou un poste.
- Nouveau service de statistiques ou nouveau bus d'événements.
- Refonte visuelle du frontend ; pas de nouveau design system.
- Sécurisation complète de user-service (JWT, permissions fines) au-delà des routes de postes.

## Decisions

### 1. Postes : aucun contrôle de rôle, authentification assurée par le gateway
Les routes `POST/PATCH/DELETE /positions` n'ajoutent aucun contrôle de rôle, comme les routes départements. L'authentification reste garantie par le gateway (`requiresAuth`), et le service n'est joignable que par lui dans `docker-compose`. `x-user-id` sert à identifier l'auteur dans l'audit.
- *Alternative : middleware `requireRole("ADMIN")`* → écarté : contredit la décision « mêmes droits pour tous » ; à réintroduire dans le change de séparation par rôle.
- *Alternative : vérifier le JWT dans user-service* → dépendance et secret partagé pour trois routes, sans bénéfice tant que les rôles sont ouverts.

### 2. Suppression d'un poste : vérification auprès d'assignment-service
Le refus de suppression en présence d'une affectation active exige de connaître les affectations. user-service appelle assignment-service sur une nouvelle route de lecture `GET /assignments?assigneeType=POSITION&assigneeId=<id>&status=ACTIVE` (filtres optionnels ajoutés à `GET /assignments`, sans changer la réponse par défaut).
- *Alternative : réplication locale des compteurs* → complexité d'événements disproportionnée.
- *Alternative : suppression logique seulement (INACTIF)* → contredit la spec « suppression » et laisse des postes inutiles ; la désactivation reste possible via `PATCH`.
- Si assignment-service est injoignable, la suppression est **refusée** (échec fermé), pas autorisée.

### 3. Audit des postes par HTTP vers audit-service
user-service n'a pas RabbitMQ. Il publie les événements d'audit par un appel HTTP best-effort vers audit-service (le même repli que celui de `auth-service`), sans bloquer la réponse en cas d'échec. Le nom de service est `user-service`.
- *Alternative : ajouter `amqplib` et le canal RabbitMQ à user-service* → plus robuste mais plus lourd (config, reconnexion, Docker). Recommandé plus tard si d'autres opérations de user-service doivent être auditées.

### 4. Lecture des en-têtes d'import : endpoint de prévisualisation côté serveur
Ajout de `POST /equipments/import/preview` (multipart, mêmes contraintes de fichier que l'import) qui renvoie `{ headers, sampleRows, suggestedMapping }` en réutilisant `spreadsheet.reader` et le mapper d'en-têtes. L'interface n'a ainsi ni parseur XLSX ni règles de reconnaissance dupliquées.
- *Alternative : parser côté navigateur (SheetJS)* → dépendance lourde et règles de reconnaissance en double à maintenir.
- *Alternative : mapping en JSON saisi à la main* → inutilisable pour un utilisateur non technique.
- Le fichier est envoyé deux fois (aperçu puis import) ; acceptable pour 5 Mo max.

### 5. Affectation : composant unique paramétré par le type de bénéficiaire
`AssignmentModal` gagne un sélecteur de type ; les données (utilisateurs, départements, postes) sont chargées à la demande et filtrées sur l'état actif. Pour les postes, le libellé inclut le département (« Nom, Département ») et une liste déroulante de département peut préfiltrer. Le corps envoyé est `assigneeType` + `assigneeId` (plus jamais `userId`).
Le type frontend `Assignment` reçoit `assigneeType`, `assigneeId` et `assignee` ; `user` reste optionnel pour compatibilité. La colonne Bénéficiaire lit `assignee` d'abord.

### 6. Tableau de bord : KPIs matérialisés + agrégations côté client, graphiques en SVG maison
Deux sources, selon ce que le backend sait fournir :
- **`GET /dashboard/kpis`** : total, statut, catégorie, affectations actives par type de bénéficiaire, inventaires en cours, fraîcheur. Une seule requête, sans télécharger la liste d'équipements.
- **Liste d'affectations déjà chargée** (enrichie avec `assignee`) : équipements affectés par département (un poste compte pour son département, un utilisateur pour son département) et évolution créations/restitutions sur la période choisie (`assignedAt`, `returnInfo.returnDate`), regroupée par jour (≤ 31 jours) ou par semaine.

Diagrammes retenus (un choix de forme par question d'analyse) :

| Question | Diagramme |
|---|---|
| Quelle part du parc est disponible, affectée, en maintenance ? | Barre empilée horizontale + légende chiffrée, segments cliquables |
| Quelles catégories pèsent le plus, et lesquelles manquent de stock disponible ? | Barres horizontales triées (total) avec part « disponible » |
| À qui affecte-t-on (utilisateur / département / poste) ? | Anneau avec total au centre |
| Quels départements concentrent le matériel ? | Barres horizontales classées, top 8 + « Autres » |
| Comment évoluent les affectations ? | Barres groupées créées / restituées, axe temps |

Règles communes des composants SVG/CSS (sans dépendance) : titre, légende, valeur + pourcentage affichés, infobulle au survol et au focus clavier, motifs ou libellés en plus de la couleur, palette issue des tokens Tailwind existants, `viewBox` responsive, état vide, `role="img"` et `aria-label` résumant le contenu.
Un clic sur un segment de statut navigue vers `/equipments?status=<STATUT>` ; `EquipmentsPage` initialise son filtre depuis ce paramètre.
- *Alternative : recharts ou chart.js* → ~100 à 200 Ko pour cinq graphiques simples, et styles à surcharger pour coller au thème ; réévaluable si le besoin grandit (zoom, export d'image).
- *Alternative : ajouter département et série temporelle aux KPIs matérialisés* → plus juste à grande échelle mais élargit le périmètre à inventory-service et aux consommateurs d'événements ; laissé pour plus tard.

### 7. Droits identiques : une seule source, facile à re-séparer
- `ROLE_PERMISSIONS` (auth-service) attribue à ADMIN, RESPONSABLE, EMPLOYE et AUDITEUR la même liste complète de permissions, avec un commentaire indiquant qu'il s'agit d'un état temporaire. Une constante unique `ALL_PERMISSIONS` alimente les quatre rôles : réintroduire des rôles plus tard revient à remplacer cette constante par des listes distinctes.
- `POST /dashboard/kpis/rebuild` passe de `authenticate + requireRole("ADMIN")` à `authenticate` seul.
- Le frontend ne lit plus le rôle pour masquer un bouton : aucun utilitaire `isAdmin` / `canImport`.
- *Alternative : neutraliser `checkPermission` dans chaque service* → six points de modification à défaire, contre un seul avec `ALL_PERMISSIONS`.
- Les permissions étant portées par le JWT, les utilisateurs déjà connectés doivent se reconnecter.

### 8. Livraison Git
Une branche par lot, à partir de `develop`, commits conventionnels en français (`feat:`, `fix:`, `docs:`), pull requests vers `develop` avec le pipeline Actions vert :
1. `chore/frontend-baseline` : suivre `frontend/` (avec un `.gitignore` correct, sans `node_modules` ni `dist`) et commiter les modifications backend en attente par service.
2. `feat/positions-crud`
3. `feat/assignment-assignee-types-ui`
4. `feat/equipment-import-export-ui`
5. `feat/dashboard-kpi-charts`
Aucun `push --force`, aucun contournement des hooks. Les secrets (`.env`) ne sont jamais commités ; seuls les `.env.example` le sont.

## Risks / Trade-offs

- [Tous les rôles ont tous les droits, y compris la suppression et la validation d'inventaire] → Assumé et temporaire ; l'audit trace l'auteur de chaque action ; change dédié de séparation par rôle à planifier ensuite.
- [JWT déjà émis avec les anciennes permissions] → Reconnexion nécessaire après déploiement ; à annoncer aux utilisateurs.
- [user-service accessible sans vérification JWT propre] → Ne jamais l'exposer hors du gateway ; vérification JWT à traiter avec la séparation par rôle.
- [Diagrammes département et évolution calculés côté client à partir de la liste d'affectations] → Acceptable au volume actuel ; si le volume croît, déplacer ces agrégats dans les KPIs matérialisés.
- [Refus de suppression si assignment-service est indisponible] → Message d'erreur clair ; la désactivation (`INACTIF`) reste possible.
- [Audit HTTP best-effort peut perdre des événements] → Accepté à ce stade ; journal d'erreurs côté user-service.
- [Import en deux envois du même fichier] → Limite de 5 Mo ; l'aperçu ne conserve rien côté serveur.
- [Liste d'affectations complète chargée côté client, avec enrichissement d'un appel user-service par ligne] → Non traité ici ; à surveiller si le volume croît (pagination hors périmètre).
- [KPIs non synchronisés au premier démarrage] → Avertissement visible et action de reconstruction (spec dashboard).
- [Premier commit de `frontend/` volumineux] → Vérifier `.gitignore` avant `git add`, relire la liste des fichiers ajoutés.
- [Nombreuses modifications non commitées dans plusieurs services] → Les découper par service avant de démarrer les lots fonctionnels, pour garder des PR relisibles.

## Migration Plan

1. Aucune migration de schéma : `Position` existe déjà avec l'unicité `(name, departmentId)`.
2. Déploiement dans l'ordre : auth-service (permissions identiques), assignment-service (filtres), inventory-service (`rebuild`), user-service (CRUD postes), equipment-service (preview), puis frontend.
3. Les utilisateurs se reconnectent pour recevoir les nouvelles permissions.
4. Retour arrière : les nouvelles routes sont additives ; restaurer les listes de permissions par rôle et le `requireRole("ADMIN")` de `rebuild` (ou revenir à la version précédente) suffit, sans impact sur les données.

## Open Questions

- Faut-il, à terme, faire migrer l'audit de user-service vers RabbitMQ pour l'aligner sur les autres services ?
