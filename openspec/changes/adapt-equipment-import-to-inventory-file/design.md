# Design

## Context

L'import des équipements est réparti en trois étages dans `equipment-service/src/services/import-export/` : `spreadsheet.reader.ts` (lit la première feuille : en-têtes en ligne 1, lignes entièrement vides ignorées), `equipment-row.mapper.ts` (reconnaissance des colonnes par alias, validation, construction des équipements unitaires) et `equipment-import.service.ts` (aperçu, import « tout ou rien », création des catégories manquantes, affectation automatique). Voir proposition pour le fichier d'inventaire réel et les mesures.

Contraintes observées :
- `readSpreadsheet` est aussi utilisé par l'import des catégories (`category-import.service.ts`, changement `manage-and-import-categories`) : toute modification de son comportement par défaut changerait cet import.
- Les numéros de ligne renvoyés sont des numéros d'enregistrement (une cellule multi-ligne entre guillemets compte pour une ligne), donc identiques à ceux que l'utilisateur voit dans Excel.
- Le mapping personnalisé fourni par le client associe un en-tête à un champ ; `resolveColumnMapping` ne retient qu'un en-tête par champ.
- `barcode` n'est pas unique en base ; `purchasePrice` est `Decimal(12,2)` ; il n'y a aucun champ « référence » dans `Equipment`.

## Goals / Non-Goals

**Goals :**
- Importer `NEWLOGISTIQUE SITE- 2.csv` tel quel, sans retouche manuelle (hors vraies erreurs de saisie du fichier).
- Aucune régression pour les fichiers déjà acceptés (en-tête en ligne 1, montants sans monnaie) ni pour l'import des catégories.
- Aucun changement de schéma de base de données.

**Non-Goals :**
- Corriger automatiquement les erreurs de saisie du fichier (une ligne dont toutes les cellules contiennent un nom de personne, une date « CHI GEORGE MOFOR ») : elles restent signalées par ligne et refusent l'import (« tout ou rien » conservé).
- Importer plusieurs feuilles, ou fusionner les 52 identifiants en double : ils ne sont pas importés (voir décision 5).
- Générer des numéros de série : les équipements restent « à compléter ».

## Decisions

1. **Détection d'en-tête dans le lecteur, activée seulement à la demande.** `readSpreadsheet(buffer, filename, options?)` reçoit `{ detectHeaderRow: true, knownHeaders }` depuis l'import des équipements ; sans option, le comportement actuel (ligne 1) est inchangé, ce qui protège l'import des catégories. La ligne retenue est la première, parmi les 20 premières, dont au moins deux cellules, une fois normalisées par `normalizeHeader`, figurent parmi les alias connus (ou parmi les en-têtes du mapping personnalisé) ; à défaut, la première ligne non vide. *Alternative écartée :* demander le numéro de ligne d'en-tête à l'utilisateur (ajoute une étape et une erreur possible, alors que le fichier est reconnaissable de façon fiable).
2. **Lignes vides et fin des données dans le lecteur.** Une cellule dont le texte, une fois les espaces retirés, est vide ou composé uniquement de parenthèses vides est traitée comme vide ; une ligne sans valeur est ignorée et comptée (`ignoredRowCount`). La lecture s'arrête à la première ligne dont la première cellule non vide, normalisée, commence par `LISTE DES VALEURS`. *Alternative écartée :* ne garder que les lignes ayant un identifiant de la forme `Xxx-Yyy-NNN` (trop spécifique à ce fichier).
3. **Nom de repli = catégorie**, après nom puis marque et modèle. Une ligne sans aucun de ces éléments reste en erreur « Nom manquant » (elle correspond en pratique à une ligne mal saisie).
4. **Montants : monnaie explicite pour changer l'interprétation.** `asNumber` reconnaît un suffixe `F`, `FCFA`, `XAF` ou `CFA` (insensible à la casse) et, dans ce cas seulement, lit `.`, `,` ou l'espace suivis d'exactement trois chiffres comme séparateur de milliers. Sans marqueur, la lecture actuelle est conservée (`19.5` reste 19,5) : `19.500` seul est ambigu et le changer casserait des fichiers existants. Le prix reste porté par chaque équipement généré, donc unitaire. Un décimal réel suivi d'une monnaie (`19,50 F`) reste lu comme un décimal.
5. **`IDENTIFIANT` non importé, code-barres nettoyé.** La colonne répète le code-barres entre parenthèses et n'est pas unique (un code par type de matériel, par exemple `Equ-Cli-001` sur 5 climatiseurs de pièces différentes) : l'associer au numéro de série produirait 109 erreurs de doublon. On conserve l'information dans `barcode` après suppression des parenthèses englobantes. *Alternative écartée :* nouveau champ « référence » (migration et modifications d'écrans pour une valeur déjà conservée).
6. **Notes fusionnées.** Le champ `notes` accepte plusieurs colonnes (`CARACTERISTIQUES`, `OBSERVATIONS / HISTORIQUE`), réunies dans l'ordre du fichier avec « | ». `resolveColumnMapping` garde son résultat (un seul en-tête par champ, donc rien ne change pour ses appelants) ; une fonction dédiée, `resolveNotesHeaders`, renvoie la liste des en-têtes de notes et `buildEquipmentDrafts` la reçoit en paramètre facultatif. Côté frontend, `findDuplicateFields` n'est plus déclenché pour `notes`. *Alternative écartée :* ne retenir qu'une des deux colonnes (perte des observations).
7. **Rapport.** `preview` et `import` renvoient `headerRow` et `ignoredRowCount` ; la fenêtre d'import les affiche (« en-tête détecté en ligne 5, N lignes ignorées »). Aucun champ existant n'est modifié ou retiré.
8. **Détection du séparateur sur plusieurs lignes.** `detectDelimiter` ne lit aujourd'hui que la première ligne ; un titre sans point-virgule ferait choisir la virgule. Elle compte désormais les séparateurs sur les premières lignes non vides.
9. **Tests sur un fichier d'exemple synthétique.** Un fichier de test reprend la structure du fichier réel (titre, en-tête en ligne 5, lignes `()`, mobilier sans nom, montants `19.500 F`, code-barres entre parenthèses, cellule multi-ligne, bloc « LISTE DES VALEURS », une ligne mal saisie) sans en reprendre les données : le fichier réel n'est pas ajouté au dépôt.

## Risks / Trade-offs

- **[Un autre fichier utilise « LISTE DES VALEURS » comme libellé d'équipement]** → La règle ne s'applique qu'à la première cellule non vide d'une ligne qui commence par ce libellé ; improbable pour un équipement, et documenté dans la fenêtre d'import.
- **[Détection d'en-tête trop permissive : une ligne de données ressemble à un en-tête]** → Seuil de deux colonnes reconnues, dans les vingt premières lignes uniquement ; en cas d'échec, l'utilisateur voit la ligne détectée dans l'aperçu avant de confirmer.
- **[Montant `1.500 F` voulant dire 1,5 F]** → Hypothèse FCFA (pas de centimes en pratique) ; sans marqueur de monnaie, aucun changement.
- **[612 équipements « à compléter » d'un coup]** → Voulu : aucun numéro de série n'existe dans le fichier ; ils restent visibles et filtrables par statut.
- **[Fichier de 1 312 lignes lu en mémoire]** → Dans la limite actuelle de 5 Mo (le fichier fait 70 Ko) et de 5 000 équipements par import (limite existante).
- **[Ligne mal saisie dans le fichier réel (ligne 318 : tous les champs contiennent le même nom de personne ; une date « CHI GEORGE MOFOR »)]** → L'import est refusé avec les numéros de ligne ; l'utilisateur corrige ces lignes dans son fichier puis relance. Ce n'est pas un défaut du changement.

## Migration Plan

Aucune migration de données. Déploiement par reconstruction de l'image d'equipment-service et du frontend. Retour arrière : revenir au commit précédent ; les équipements déjà importés ne sont pas modifiés.
