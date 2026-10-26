# Tasks

## 1. Route interne d'affectation

- [x] 1.1 Ajouter dans assignment-service `GET /api/assignments/internal/active/:equipmentId` sans authentification utilisateur, renvoyant uniquement le type et le nom du bénéficiaire de l'affectation active (ou rien), et vérifier par un test qu'un équipement affecté à un utilisateur renvoie son nom et qu'un équipement libre renvoie vide
- [x] 1.2 Protéger cette route par le secret partagé `INTERNAL_SERVICE_TOKEN` (refus sans secret ou avec un mauvais secret, refus si le secret n'est pas configuré), le déclarer dans docker-compose et les `.env.example`, et vérifier par des tests que la passerelle renvoie 401 sans jeton sur `/assignments/internal/...` et que le service refuse une requête sans le bon secret

## 2. Fiche publique

- [x] 2.1 Ajouter dans equipment-service `GET /api/public/equipments/:id` avec validation d'UUID, réponse construite par liste blanche de champs (sans prix, fournisseur, notes), et vérifier par test que ces champs sont absents de la réponse
- [x] 2.2 Renvoyer la même réponse 404 pour un UUID inconnu et pour un identifiant mal formé, et vérifier que les deux réponses sont identiques
- [x] 2.3 Enrichir la fiche avec le bénéficiaire via un client vers la route interne, avec délai d'attente court et repli « indisponible », et vérifier qu'une panne d'assignment-service n'empêche pas la réponse
- [x] 2.4 Exposer `/public` dans la passerelle sans authentification, avec une limite de débit par IP, et vérifier par test qu'une salve de requêtes finit par recevoir l'erreur de limitation

## 3. Interface publique

- [x] 3.1 Ajouter la route `/e/:id` hors de la mise en page authentifiée et la page de fiche publique adaptée au téléphone (identification, état, dates, emplacement, bénéficiaire), et vérifier l'affichage avec un équipement affecté et un équipement libre
- [x] 3.2 Afficher un état « équipement introuvable » clair, et vérifier avec un identifiant inconnu et un identifiant mal formé
- [x] 3.3 Afficher le lien vers la fiche complète seulement si un jeton de connexion existe, sinon l'invitation à se connecter, et vérifier les deux cas

## 4. Génération de QR et étiquettes

- [x] 4.1 Ajouter la dépendance `qrcode` et l'adresse publique configurable (`VITE_PUBLIC_APP_URL`), écrire l'utilitaire qui construit l'URL `/e/<id>`, et vérifier par un test unitaire l'URL obtenue avec et sans configuration
- [x] 4.2 Remplacer l'icône décorative de la fiche équipement par le QR généré, avec un bouton de téléchargement nommé d'après le numéro de série, et vérifier que le fichier téléchargé se scanne
- [x] 4.3 Créer la page `/equipments/labels` (grille d'étiquettes QR, nom, numéro de série) avec styles d'impression qui masquent la navigation, et vérifier l'aperçu d'impression du navigateur
- [x] 4.4 Ajouter l'action « Imprimer les étiquettes » à la sélection multiple de la liste des équipements, désactivée sans sélection, et vérifier qu'elle transmet les bons identifiants
- [x] 4.5 Ajouter le bouton d'étiquettes dans le rapport de la modale d'import, avec les équipements créés, et vérifier après un import de test

## 5. Scanner intégré

- [x] 5.1 Ajouter la dépendance `html5-qrcode` et la page ou modale « Scanner » accessible aux utilisateurs connectés, et vérifier que la caméra s'ouvre en HTTPS ou sur localhost
- [x] 5.2 Écrire l'analyse du contenu scanné (URL `/e/<uuid>` de l'application ou rien) et vérifier par tests unitaires : URL valide, URL d'un autre site, texte quelconque
- [x] 5.3 Ouvrir `/equipments/:id` après un scan valide et afficher « code non reconnu » sinon, en restant sur le scanner ; vérifier les deux chemins
- [x] 5.4 Gérer l'absence ou le refus de caméra avec un message explicite et la saisie manuelle du numéro de série, et vérifier en refusant l'autorisation

## 6. Documentation

- [x] 6.1 Documenter dans le README la configuration de l'adresse publique, les champs exposés publiquement, la nécessité de HTTPS pour le scanner et l'effet d'un changement d'adresse sur les étiquettes, et vérifier que chaque point y figure
