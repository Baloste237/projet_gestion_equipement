# Tasks

## 1. Fichier d'exemple et lecteur

- [x] 1.1 Créer `services/equipment-service/tests/fixtures/import-inventory.csv` (UTF-8 avec BOM, séparateur `;`) reprenant la structure du fichier réel sans ses données : titre sur 4 lignes, en-tête en ligne 5, une ligne d'équipement par cas (mobilier sans marque ni modèle, montant `19.500 F`, code-barres `(Inf-Cla-001)`, quantité 3, cellule multi-ligne entre guillemets, caractéristiques et observations), lignes `;()` vides, bloc « LISTE DES VALEURS DU TABLEAU » avec listes ; vérifier que le fichier fait moins de 5 Ko et ne contient aucun nom de personne réel
- [x] 1.2 Dans `spreadsheet.reader.ts`, ajouter l'option `{ detectHeaderRow, knownHeaders }` à `readSpreadsheet` (en-tête = première ligne des 20 premières avec au moins deux colonnes reconnues, sinon première ligne non vide ; sans option, comportement inchangé), renvoyer `headerRow` et `ignoredRowCount`, traiter `()` comme vide, et s'arrêter à la ligne « LISTE DES VALEURS… » ; vérifier par des tests unitaires : en-tête en ligne 5 détecté, en-tête en ligne 1 inchangé, aucune colonne reconnue (première ligne non vide), lignes `()` ignorées et comptées, lecture arrêtée à la liste, numéros de ligne identiques à ceux du fichier avec une cellule multi-ligne
- [x] 1.3 Faire détecter le séparateur sur les premières lignes non vides plutôt que sur la première seulement ; vérifier avec un test où le titre ne contient aucun point-virgule et où l'en-tête en contient
- [x] 1.4 Vérifier avec `npm test` dans `services/equipment-service` que l'import des catégories et les tests existants d'import passent sans modification (la détection reste désactivée par défaut)

## 2. Reconnaissance et validation des lignes

- [x] 2.1 Dans `equipment-row.mapper.ts`, ajouter les alias « DATE D'ACQUISITION » (date d'achat) et « CARACTERISTIQUES » (notes), faire accepter plusieurs colonnes pour `notes` (réunies avec « | » dans l'ordre du fichier) avec une fonction dédiée `resolveNotesHeaders` (`resolveColumnMapping` inchangé) ; ajouter aussi l'alias « MONTANT » (prix d'achat) ; vérifier par tests : notes issues de deux colonnes, une seule colonne, aucune, autres champs toujours à un seul en-tête
- [x] 2.2 Ajouter le nom de repli (catégorie quand nom, marque et modèle sont absents) et conserver l'erreur « Nom manquant » sans catégorie ; vérifier par tests : « CHAISE » sans marque ni modèle crée un équipement nommé « CHAISE », une ligne sans catégorie ni nom reste refusée
- [x] 2.3 Faire lire les montants avec marqueur de monnaie (`F`, `FCFA`, `XAF`, `CFA`, séparateur de milliers `.`, `,` ou espace suivi de trois chiffres) sans changer la lecture des montants sans monnaie ; vérifier par tests : `19.500 F` donne 19 500, `81.250 F` donne 81 250, `19.5` reste 19,5, `19,50 F` reste décimal, `sur devis` reste « Prix invalide », ligne de quantité 3 donne trois équipements au même prix
- [x] 2.4 Retirer les parenthèses englobantes du code-barres et traiter `()` comme vide ; vérifier par tests : `(Equ-Cli-001)` donne `Equ-Cli-001`, `()` donne aucun code-barres, un code sans parenthèses est inchangé
- [x] 2.5 Vérifier avec les tests du mapper que « IDENTIFIANT » n'est associé à aucun champ par défaut, que « MONTANT » alimente le prix d'achat et que « DATE D'ACQUISITION » alimente la date d'achat (`09/01/2009` donne le 9 janvier 2009)

## 3. Service d'import et API

- [x] 3.1 Dans `equipment-import.service.ts`, activer la détection d'en-tête à l'aperçu et à l'import, passer les alias connus et le mapping personnalisé au lecteur, et ajouter `headerRow` et `ignoredRowCount` aux réponses d'aperçu et d'import ; vérifier par test sur `import-inventory.csv` : aperçu avec en-tête en ligne 5, colonnes reconnues, nombre de lignes ignorées attendu
- [x] 3.2 Vérifier par un test de bout en bout du service (dépôt remplacé) que l'import du fichier d'exemple crée le bon nombre d'équipements (quantités comprises), avec noms de repli, prix unitaires, notes fusionnées et code-barres nettoyés, et que les lignes de la liste de valeurs ne créent rien
- [x] 3.3 Vérifier par un test qu'une ligne mal saisie (date en texte libre) refuse tout l'import avec son numéro de ligne d'origine, et qu'aucun équipement n'est créé
- [x] 3.4 Mettre à jour la documentation Swagger de `POST /api/equipments/import` et `/import/preview` (champs `headerRow`, `ignoredRowCount`) ; vérifier avec `npx tsc --noEmit` et `/api-docs.json`

## 4. Interface

- [x] 4.1 Dans `frontend/src/services/api.ts`, ajouter `headerRow` et `ignoredRowCount` aux types `ImportPreview` et `ImportResult` ; dans `utils/importMapping.ts`, ne plus signaler de doublon pour le champ `notes` ; vérifier par des tests de `findDuplicateFields` (deux colonnes en notes acceptées, deux colonnes en nom toujours refusées)
- [x] 4.2 Dans `ImportEquipmentsModal.tsx`, afficher « en-tête détecté en ligne N » et le nombre de lignes ignorées à l'étape de mapping, et rappeler que la lecture s'arrête à « LISTE DES VALEURS » ; vérifier avec `npx tsc -b`, `npm test` et `npm run build` dans `frontend`

## 5. Documentation et vérification d'ensemble

- [x] 5.1 Mettre à jour le README (section import : en-tête détecté, lignes ignorées, nom de repli, montants FCFA, colonnes reconnues) ; vérifier par relecture
- [x] 5.2 Vérifier en conditions réelles sur une base jetable (même méthode que pour les catégories) : migrations, import de `import-inventory.csv` par le service, relance de l'import (équipements sans série dupliqués comme prévu), puis suppression de la base d'essai ; vérifier que la base d'essai n'existe plus
- [x] 5.3 Parcours manuel avec un compte autorisé : importer le vrai fichier `NEWLOGISTIQUE SITE- 2.csv` ; corriger dans le fichier les lignes signalées par l'import (par exemple la ligne dont tous les champs contiennent un nom de personne), relancer, puis vérifier le nombre d'équipements créés, leur statut « à compléter », leurs catégories et les prix unitaires
