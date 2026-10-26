# Proposition

## Pourquoi

L'import des équipements suppose un fichier « propre » : en-têtes en ligne 1, une ligne = un équipement. Le fichier d'inventaire réel du site (`NEWLOGISTIQUE SITE- 2.csv`, 1 312 lignes, séparateur `;`, UTF-8 avec BOM) ne l'est pas, et l'import le refuse en bloc. Mesuré en rejouant le vrai code de lecture et de validation sur ce fichier :

- **Fichier tel quel : 0 équipement créé.** Le titre « INVENTAIRE MATERIEL… » (lignes 1 à 4, l'en-tête réel est en ligne 5) est lu comme unique en-tête : aucune colonne n'est reconnue et les 390 lignes sont rejetées pour « Nom manquant ».
- **Lignes parasites** : environ 900 lignes-modèles vides ne contenant que `()` dans « CODE BAR », puis un bloc « LISTE DES VALEURS DU TABLEAU » (listes de catégories, emplacements, marques) qui serait importé comme des équipements.
- **126 lignes sans nom** (mobilier : chaises, armoires, multiprises) : ni colonne « nom », ni marque, ni modèle ; or le nom est obligatoire et l'import est « tout ou rien ».
- **Montants** `19.500 F` et `81.250 F` refusés (« Prix invalide ») ; sans le « F », `19.500` serait lu 19,5 au lieu de 19 500 FCFA.
- **Colonnes non reconnues** : « MONTANT » (l'alias connu est « PRIX »), « DATE D'ACQUISITION » (« DATE ACHAT ») et « CARACTERISTIQUES ».
- **Codes-barres** saisis `(Equ-Cli-001)` entre parenthèses, donc inutilisables tels quels pour un scan.

Le fichier doit pouvoir être importé tel quel, sans retouche manuelle préalable.

## Ce qui change

- **En-tête détecté automatiquement** : l'import cherche, dans les premières lignes, la ligne qui contient au moins deux colonnes connues et l'utilise comme en-tête ; les lignes au-dessus (titre, lignes vides) sont ignorées. Un fichier dont l'en-tête est en ligne 1 se comporte comme aujourd'hui.
- **Lignes ignorées sans erreur** : une ligne sans aucune valeur significative (cellules vides ou réduites à `()`) est ignorée, et la lecture s'arrête à la ligne-titre « LISTE DES VALEURS… ». Le nombre de lignes ignorées est rapporté.
- **Nom de repli** : à défaut de nom, marque et modèle, le nom est la catégorie (« CHAISE », « ARMOIRE »).
- **Montants en FCFA** : un montant suivi d'un marqueur de monnaie (`F`, `FCFA`, `XAF`, `CFA`) est lu avec le point ou l'espace comme séparateur de milliers (`19.500 F` devient 19 500). Sans marqueur de monnaie, la lecture actuelle est inchangée. Le montant est un **prix unitaire** : chacun des N équipements d'une ligne de quantité N le porte.
- **Colonnes reconnues en plus** : « MONTANT » (prix d'achat), « DATE D'ACQUISITION » (date d'achat) et « CARACTERISTIQUES » (notes). Plusieurs colonnes peuvent alimenter les notes (« CARACTERISTIQUES » et « OBSERVATIONS / HISTORIQUE ») : leurs textes sont réunis.
- **Code-barres nettoyé** : les parenthèses englobantes sont retirées (`(Equ-Cli-001)` devient `Equ-Cli-001`) ; `()` vaut vide. La colonne « IDENTIFIANT », qui répète ce code et n'est pas unique (un code par type de matériel), n'est pas importée.
- **Aperçu enrichi** : la réponse d'aperçu et d'import indique la ligne d'en-tête détectée et le nombre de lignes ignorées, et la fenêtre d'import l'affiche.
- Le comportement « tout ou rien » est conservé : les erreurs réelles du fichier (par exemple une ligne dont toutes les cellules contiennent le même nom de personne, ou une date en texte libre) restent signalées par ligne et refusent l'import.

## Capacités

### Nouvelles capacités

Aucune.

### Capacités modifiées

- `equipment-import-export`: l'importation accepte un fichier d'inventaire avec titre au-dessus de l'en-tête, lignes parasites, lignes sans nom, montants en FCFA et colonnes supplémentaires.

## Impact

- **equipment-service** : `spreadsheet.reader.ts` (détection de l'en-tête, arrêt à la liste de valeurs, lignes sans valeur), `equipment-row.mapper.ts` (alias, nom de repli, montants, code-barres, notes multiples), `equipment-import.service.ts` (réponses d'aperçu et d'import) et leurs tests, avec un fichier d'exemple de test reprenant la structure du fichier réel.
- **frontend** : fenêtre d'import (affichage de la ligne d'en-tête et des lignes ignorées), contrôle de doublon de champ à assouplir pour les notes, types de réponse.
- **Données** : aucun changement de schéma ni de migration.
- **Hors périmètre** : les ~612 équipements importés n'ont pas de numéro de série et auront donc le statut « à compléter » (comportement existant, voulu) ; l'affectation automatique reste inchangée (la colonne « MIS A LA DIPOSITION DE » est vide dans ce fichier).
- **Lien avec `manage-and-import-categories`** : indépendant. L'import des équipements crée déjà les catégories manquantes par nom ; l'import séparé des catégories peut être fait avant mais n'est pas requis.
