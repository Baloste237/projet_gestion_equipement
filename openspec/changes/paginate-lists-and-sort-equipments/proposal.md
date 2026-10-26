# Proposition

## Pourquoi

Aucune liste de l'application n'est paginée : chaque page charge la liste complète puis la filtre dans le navigateur. Cela devient un problème maintenant que l'import d'inventaire a porté les équipements à **620** (limite d'import : 5 000), que le journal d'audit **croît sans limite** (aucun `LIMIT` : chaque écriture du système y ajoute une ligne et la page le relit en entier toutes les 5 secondes) et que les affectations groupées peuvent produire plusieurs centaines de lignes.

Constats dans le code :
- `GET /equipments` n'a **aucun `ORDER BY`** : l'ordre est laissé à PostgreSQL, donc instable. Une pagination sans tri déterministe répéterait ou sauterait des lignes.
- Un import crée tous ses équipements dans une même transaction, avec le **même `createdAt`** : un tri par date seule ne départage pas ces lignes, il faut un second critère.
- Le tableau des équipements n'affiche aucune date, alors que la date d'ajout, la date d'achat, la date de mise en service et la dernière modification existent.
- La page d'audit calcule ses compteurs (total, authentifications, modifications, taux de réussite) et ses filtres (acteur, catégorie, jour) sur la liste complète ; ils ne survivraient pas à une simple pagination.
- Au moins 14 appels du frontend et d'autres services (inventory-service pour les KPIs, scanner, fenêtres d'affectation) lisent les listes **en entier** : le contrat actuel doit rester utilisable.

## Ce qui change

- **Pagination serveur optionnelle** pour les équipements (`GET /equipments`) et le journal d'audit (`GET /audit-logs`) : paramètres `page` et `pageSize` (au plus 100), réponse enrichie d'un bloc `meta` (`total`, `page`, `pageSize`, `totalPages`). **Sans paramètre, la réponse est celle d'aujourd'hui** (liste complète) : inventory-service, le scanner et les fenêtres de sélection ne changent pas.
- **Tri et filtres serveur des équipements** : tri par `createdAt` (date d'ajout, par défaut, du plus récent au plus ancien), `purchaseDate`, `commissionedAt` ou `updatedAt`, avec `order` ; départage stable par identifiant ; équipements sans date placés en fin de liste. Recherche (`q`), catégorie (`categoryId`) et statut (`status`) passent côté serveur.
- **Filtre par période** sur la date de tri : `from` et `to` ; l'interface les saisit au format **jj/mm/AAAA** (champ texte à masque, validation des jours, mois et de l'ordre des deux dates) et l'API les reçoit en `AAAA-MM-JJ`. Les équipements sans date sont exclus quand une période est active sur cette date.
- **Journal d'audit côté serveur** : pagination, filtres (acteur ou identifiant `q`, catégorie d'action, jour) et un bloc `summary` (total, authentifications, modifications, échecs) calculé sur tout le journal, pour que les compteurs de la page restent exacts. La création des journaux d'exemple dans `getAll` n'est jamais déclenchée par un appel paginé ou filtré. Index sur `AuditLog.createdAt`.
- **Pagination dans le navigateur** pour les listes de taille modérée (affectations, catégories, utilisateurs, postes) avec le même composant.
- **Composant de pagination commun** : page précédente et suivante, numéros de page avec points de suspension, « x à y sur N », taille de page 10, 25 (par défaut), 50 ou 100 mémorisée par l'utilisateur ; retour à la page 1 à chaque changement de filtre ou de tri ; page ramenée dans les limites si la liste rétrécit.
- **Tableau des équipements** : colonne « Ajouté le » (jj/mm/AAAA), sélecteur de date de tri et de sens, champs « du » et « au » ; la sélection multiple (limite 200 conservée) fonctionne sur la **page courante** et se **conserve d'une page à l'autre**.
- Hors périmètre : départements (quelques cartes), tableau de bord, étiquettes, inventaires, export (inchangé : il lit déjà côté serveur), index de tri des équipements (inutile à ces volumes), refonte de la création des journaux d'exemple.

## Capacités

### Nouvelles capacités

- `list-pagination`: règles communes de pagination (contrat d'API optionnel avec `meta`, composant, tailles de page, retour à la page 1, listes concernées et listes exclues).
- `equipment-date-sorting`: tri des équipements par date, filtre par période en jj/mm/AAAA, ordre stable, dates absentes, filtres serveur, colonne « Ajouté le », sélection par page.
- `audit-log-listing`: consultation paginée du journal d'audit avec filtres serveur et compteurs globaux.

### Capacités modifiées

Aucune : les capacités existantes (affectation, tableau de bord, import et export) ne changent pas de comportement ; les exigences de ce changement s'ajoutent.

## Impact

- **equipment-service** : `equipment.controller`, `equipment.service`, `equipment.repository` (tri, filtres, pagination, `meta`), validation des paramètres, Swagger, tests ; vérification sur base jetable.
- **audit-service** : `audit-log.controller`, `service`, `repository` (filtres, pagination, `summary`), migration d'index `AuditLog.createdAt`, Swagger, tests.
- **gateway** : aucun changement de code attendu (les paramètres de requête sont déjà transmis) ; à vérifier. La limite de 300 requêtes par fenêtre de 15 minutes par IP reste inchangée.
- **frontend** : composant `Pagination`, saisie de date jj/mm/AAAA, utilitaires purs testés, `services/api.ts` (paramètres et type de réponse paginée), pages Équipements, Audit, Affectations, Catégories, Utilisateurs et Postes.
- **Compatibilité** : aucune rupture ; un appel sans `page` ni `pageSize` renvoie la liste complète comme avant.
- **Données** : une migration d'index sur le journal d'audit ; aucune donnée modifiée.
- **Hors périmètre connu** : `auditLogService.getAll` crée aujourd'hui des journaux d'exemple (« System Administrator », « Loic Stéphane BALOGOG (Admin) ») quand la table est vide ; ce comportement préexistant est conservé pour l'appel sans paramètre et signalé dans le design.
