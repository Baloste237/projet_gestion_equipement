# Tasks

## 1. Données et validation

- [x] 1.1 Ajouter `condition` (défaut FONCTIONNEL), `commissionedAt` et `decommissionedAt` au schéma Prisma d'equipment-service avec une migration additive, et vérifier que `prisma migrate deploy` s'applique sur une base existante sans perte
- [x] 1.2 Accepter les trois champs dans les validateurs de création et de modification, avec refus d'un état inconnu et d'une mise hors service antérieure à la mise en service, et vérifier par des tests de validateur
- [x] 1.3 Inclure les trois champs dans le snapshot d'audit et les événements d'équipement, et vérifier qu'un `equipment.created` les contient

## 2. Import : état et dates

- [x] 2.1 Ajouter `condition`, `commissionedAt`, `decommissionedAt` et `assigneeName` à `IMPORT_FIELDS` avec leurs alias (ETAT, DATE DE MISE EN SERVICE, DATE DE MISE HORS SERVICE, MIS A LA DISPOSITION DE, y compris la faute « DIPOSITION »), et vérifier par un test que les en-têtes du fichier d'exemple sont reconnus
- [x] 2.2 Convertir les libellés d'état dans le mapper (FONCTIONNEL, NON-FONCTIONNEL, variantes de casse, d'accent et de tiret), refuser les autres valeurs avec le numéro de ligne, et vérifier par des tests unitaires
- [x] 2.3 Lire les deux dates avec les mêmes règles que la date d'achat et refuser une mise hors service antérieure, avec tests unitaires
- [x] 2.4 Conserver dans chaque brouillon le numéro de ligne d'origine et le nom lu, et vérifier qu'une ligne de quantité N produit N brouillons portant la même ligne

## 3. Affectation automatique

- [x] 3.1 Créer un client user-service dans equipment-service (lecture de la liste des utilisateurs) et un client assignment-service (appel bulk avec relais de l'en-tête Authorization), avec délais d'attente ; vérifier par des tests avec services simulés
- [x] 3.2 Écrire la résolution des noms (normalisation, mots triés, exactement un actif) renvoyant trouvé, introuvable, ambigu ou désactivé, et vérifier avec les cas « Chi George Mofor », « Mofor Chi George », homonymes et utilisateur inactif
- [x] 3.3 Après l'insertion, regrouper les équipements AVAILABLE par utilisateur, appeler le bulk par lots de 200 au plus, et vérifier qu'un échec de lot n'annule ni les équipements ni les autres lots
- [x] 3.4 Étendre la réponse d'import avec `assignedCount` et `unassigned` (ligne, nom lu, raison), y compris `EQUIPMENT_TO_COMPLETE` et `ASSIGNMENT_UNAVAILABLE`, et vérifier par des tests d'intégration du service d'import
- [x] 3.5 Vérifier de bout en bout : un fichier avec un nom connu, un inconnu, un ambigu et une ligne sans numéro de série crée tous les équipements, en affecte uniquement le premier et liste les trois autres

## 4. Export

- [x] 4.1 Ajouter dans assignment-service `GET /assignments/active-summary` (jeton et `assignment:read`, avant la route `/:id`) renvoyant `{ equipmentId, assigneeType, assigneeId }` des affectations actives, et vérifier par un test que seules les affectations ACTIVE sont renvoyées
- [x] 4.2 Ajouter état, dates de service et bénéficiaire actuel à l'export d'equipment-service (noms résolus via user-service), avec des en-têtes identiques à ceux reconnus par l'import, et vérifier que le fichier exporté contient les colonnes
- [x] 4.3 Vérifier que l'export reste correct quand assignment-service ou user-service est indisponible (colonne bénéficiaire vide, export non bloqué)

## 5. Interface

- [x] 5.1 Ajouter les nouveaux champs à `IMPORT_FIELD_LABELS` et à la liste du mapping, et vérifier avec `importMapping.test.ts`
- [x] 5.2 Afficher dans la modale d'import le nombre d'équipements affectés et le tableau des lignes non affectées avec la raison en français, et vérifier visuellement sur un import de test
- [x] 5.3 Ajouter état et dates de service au formulaire et à la fiche d'équipement, et vérifier la création et la modification depuis l'interface
- [x] 5.4 Mettre à jour le README (colonnes reconnues, affectation automatique, rapport) et vérifier que la section décrit les raisons de non-affectation
