# Spec Delta

## ADDED Requirements

### Requirement: Import de l'état et des dates de service
L'import MUST accepter les colonnes ETAT, DATE DE MISE EN SERVICE et DATE DE MISE HORS SERVICE, reconnues automatiquement et associables dans le mapping. Les libellés FONCTIONNEL et NON-FONCTIONNEL (sans tenir compte de la casse, des accents, du tiret ou de l'espace) MUST être convertis en état de fonctionnement.

#### Scenario: Colonnes reconnues
- **WHEN** un fichier contient les colonnes « ETAT », « DATE DE MISE EN SERVICE » et « DATE DE MISE HORS SERVICE »
- **THEN** l'aperçu d'import les associe automatiquement aux champs correspondants

#### Scenario: État non fonctionnel
- **WHEN** une ligne indique « NON-FONCTIONNEL »
- **THEN** l'équipement créé a l'état `NON_FONCTIONNEL`

#### Scenario: État inconnu
- **WHEN** la cellule ETAT contient une valeur qui n'est ni fonctionnel ni non-fonctionnel
- **THEN** la ligne est refusée avec un message d'erreur indiquant la ligne et les valeurs attendues

### Requirement: Affectation automatique à l'import
L'import MUST affecter chaque équipement créé à l'utilisateur désigné par la colonne « mis à la disposition de » lorsque le nom correspond à exactement un utilisateur actif. La correspondance MUST ignorer la casse, les accents, la ponctuation et l'ordre prénom / nom. Les équipements affectés MUST passer au statut ASSIGNED.

#### Scenario: Nom reconnu
- **WHEN** une ligne de quantité 3 indique « CHI GEORGE MOFOR » et qu'un seul utilisateur actif correspond
- **THEN** les 3 équipements sont créés et affectés à cet utilisateur avec le statut ASSIGNED

#### Scenario: Ordre nom / prénom
- **WHEN** le fichier indique « Mofor Chi George » et l'utilisateur est enregistré avec le prénom « Chi George » et le nom « Mofor »
- **THEN** l'utilisateur est reconnu

#### Scenario: Cellule vide
- **WHEN** la colonne « mis à la disposition de » est vide pour une ligne
- **THEN** les équipements de la ligne sont créés sans affectation et ne figurent pas parmi les non-affectés signalés

### Requirement: Import non bloqué par une affectation impossible
Une affectation impossible MUST NOT empêcher la création des équipements. Sont concernés : nom sans correspondance, nom correspondant à plusieurs utilisateurs, utilisateur désactivé, équipement au statut A_COMPLETER, service d'affectation indisponible. Le rapport d'import MUST indiquer le nombre d'équipements affectés et lister, pour chaque ligne concernée, le nom lu et la raison.

#### Scenario: Nom inconnu
- **WHEN** une ligne indique un nom qui ne correspond à aucun utilisateur
- **THEN** les équipements sont créés sans affectation et le rapport liste la ligne avec la raison « utilisateur introuvable »

#### Scenario: Nom ambigu
- **WHEN** un nom correspond à deux utilisateurs
- **THEN** les équipements sont créés sans affectation et le rapport liste la ligne avec la raison « plusieurs utilisateurs correspondent »

#### Scenario: Équipement à compléter
- **WHEN** une ligne sans numéro de série (statut A_COMPLETER) indique un bénéficiaire reconnu
- **THEN** l'équipement est créé sans affectation et le rapport indique qu'il doit être complété avant d'être affecté

#### Scenario: Service d'affectation indisponible
- **WHEN** le service d'affectation ne répond pas après la création des équipements
- **THEN** les équipements restent créés, aucune affectation partielle n'est conservée et le rapport signale que l'affectation automatique a échoué

## MODIFIED Requirements

### Requirement: Exportation dynamique
Le système MUST exporter la liste des équipements dans un fichier structuré (Excel/CSV) incluant toutes les colonnes personnalisées, l'état de fonctionnement, les dates de mise en service et de mise hors service, ainsi que le nom du bénéficiaire actuel lorsqu'il existe.

#### Scenario: Export standard
- **WHEN** l'utilisateur demande l'exportation de l'inventaire
- **THEN** un fichier contenant les équipements et leurs métadonnées est téléchargé

#### Scenario: Export d'un équipement affecté
- **WHEN** un équipement est affecté à un utilisateur et que l'inventaire est exporté
- **THEN** la ligne de l'équipement contient l'état, les dates de service et le nom du bénéficiaire
