# Spec Delta

## ADDED Requirements

### Requirement: Détection de la ligne d'en-tête
Le système DOIT, à l'import et à l'aperçu d'un fichier CSV ou Excel, utiliser comme en-tête la première ligne, parmi les vingt premières, qui contient au moins deux colonnes reconnues (nom d'en-tête connu, ou fourni par le mapping personnalisé). Les lignes situées au-dessus (titre, lignes vides) DOIVENT être ignorées. Si aucune ligne ne convient, la première ligne non vide DOIT servir d'en-tête. La réponse DOIT indiquer le numéro de la ligne d'en-tête retenue, et les numéros de ligne des erreurs DOIVENT être ceux du fichier d'origine.

#### Scenario: Titre au-dessus de l'en-tête
- **WHEN** l'utilisateur importe un fichier dont les lignes 1 à 4 sont un titre et des lignes vides, et dont la ligne 5 contient `IDENTIFIANT; CODE BAR; CATEGORIE; EMPLACEMENT; MARQUE…`
- **THEN** la ligne 5 est l'en-tête, les colonnes sont reconnues, et la réponse indique que l'en-tête est en ligne 5

#### Scenario: En-tête en première ligne
- **WHEN** l'utilisateur importe un fichier dont la ligne 1 contient les en-têtes
- **THEN** la ligne 1 est l'en-tête et le comportement est identique à celui d'avant ce changement

#### Scenario: Aucune colonne reconnue
- **WHEN** aucune des vingt premières lignes ne contient deux colonnes reconnues
- **THEN** la première ligne non vide sert d'en-tête et l'utilisateur peut associer les colonnes à la main avec le mapping personnalisé

### Requirement: Lignes sans valeur et fin des données
Le système DOIT ignorer, sans erreur, toute ligne située après l'en-tête dont les cellules sont vides ou réduites à des parenthèses vides `()`. Le système DOIT cesser de lire le fichier à la première ligne dont la première cellule non vide commence par « LISTE DES VALEURS » (sans tenir compte de la casse ni des accents), les lignes suivantes n'étant pas des équipements. La réponse DOIT indiquer le nombre de lignes ignorées.

#### Scenario: Lignes-modèles vides
- **WHEN** le fichier contient des lignes dont la seule cellule renseignée est `()` dans la colonne code-barres
- **THEN** ces lignes ne produisent ni équipement ni erreur et sont comptées comme ignorées

#### Scenario: Bloc de listes de valeurs
- **WHEN** le fichier contient, après les équipements, une ligne « LISTE DES VALEURS DU TABLEAU » suivie de listes de catégories, d'emplacements et de marques
- **THEN** aucune de ces lignes n'est importée comme équipement

### Requirement: Nom d'un équipement sans nom, marque ni modèle
Le système DOIT, lorsqu'une ligne n'a ni nom, ni marque, ni modèle, utiliser le nom de sa catégorie comme nom de l'équipement. Une ligne sans nom, sans marque, sans modèle et sans catégorie DOIT rester refusée avec le message « Nom manquant ».

#### Scenario: Mobilier sans marque
- **WHEN** une ligne a la catégorie « CHAISE » et aucune marque, aucun modèle, aucune colonne nom
- **THEN** l'équipement est créé avec le nom « CHAISE »

#### Scenario: Ligne sans aucun élément d'identification
- **WHEN** une ligne contient une quantité et un état mais ni nom, ni marque, ni modèle, ni catégorie
- **THEN** la ligne est refusée avec l'erreur « Nom manquant » et l'import est refusé

### Requirement: Montants en francs CFA et prix unitaire
Le système DOIT lire un montant suivi d'un marqueur de monnaie (`F`, `FCFA`, `XAF` ou `CFA`, sans tenir compte de la casse) en considérant le point, la virgule ou l'espace suivis d'exactement trois chiffres comme séparateurs de milliers, et en ignorant le marqueur. Un montant sans marqueur de monnaie DOIT être lu comme avant ce changement. Le montant d'une ligne DOIT être le prix unitaire : chacun des N équipements générés par une ligne de quantité N porte ce même prix.

#### Scenario: Montant avec séparateur de milliers
- **WHEN** une ligne contient le montant `19.500 F`
- **THEN** le prix d'achat enregistré est 19 500

#### Scenario: Quantité supérieure à 1
- **WHEN** une ligne de quantité 3 contient le montant `19.500 F`
- **THEN** trois équipements sont créés, chacun avec un prix d'achat de 19 500

#### Scenario: Montant sans monnaie
- **WHEN** une ligne contient le montant `19.5` sans marqueur de monnaie
- **THEN** le prix d'achat enregistré est 19,5, comme avant ce changement

#### Scenario: Montant illisible
- **WHEN** une ligne contient le montant `sur devis`
- **THEN** la ligne est refusée avec l'erreur « Prix invalide »

### Requirement: Colonnes d'inventaire reconnues
Le système DOIT reconnaître la colonne « MONTANT » comme prix d'achat, la colonne « DATE D'ACQUISITION » comme date d'achat et la colonne « CARACTERISTIQUES » comme notes. Lorsque plusieurs colonnes sont associées aux notes (par exemple « CARACTERISTIQUES » et « OBSERVATIONS / HISTORIQUE »), le système DOIT réunir leurs textes non vides, dans l'ordre des colonnes du fichier, séparés par « | ». Le système DOIT retirer les parenthèses englobantes d'un code-barres (`(Equ-Cli-001)` devient `Equ-Cli-001`) et traiter `()` comme une valeur vide.

#### Scenario: Notes issues de deux colonnes
- **WHEN** une ligne a la caractéristique « CLAVIER USB » et l'observation « RECENT »
- **THEN** les notes de l'équipement valent « CLAVIER USB | RECENT »

#### Scenario: Code-barres entre parenthèses
- **WHEN** une ligne a le code-barres `(Inf-Cla-001)`
- **THEN** le code-barres enregistré est `Inf-Cla-001`

#### Scenario: Colonne MONTANT
- **WHEN** une ligne a la colonne « MONTANT » égale à `19.500 F` et aucun mapping personnalisé n'est fourni
- **THEN** le prix d'achat enregistré est 19 500

#### Scenario: Date d'acquisition
- **WHEN** une ligne a la date d'acquisition `09/01/2009`
- **THEN** la date d'achat enregistrée est le 9 janvier 2009

### Requirement: Rapport de lecture du fichier
Le système DOIT inclure, dans les réponses d'aperçu et d'import, le numéro de la ligne d'en-tête retenue et le nombre de lignes ignorées. La fenêtre d'import DOIT afficher ces deux informations avant la confirmation.

#### Scenario: Aperçu d'un fichier d'inventaire
- **WHEN** l'utilisateur sélectionne un fichier dont l'en-tête est en ligne 5 et qui contient des lignes-modèles vides
- **THEN** la fenêtre d'import indique « en-tête détecté en ligne 5 » et le nombre de lignes ignorées

#### Scenario: Erreurs réelles conservées
- **WHEN** le fichier contient une ligne dont la date de mise en service est un texte libre
- **THEN** l'import est refusé en entier et l'erreur est signalée avec le numéro de ligne du fichier d'origine
