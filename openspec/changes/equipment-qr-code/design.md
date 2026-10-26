# Design

## Context

Toutes les routes passent par la passerelle ([services.config.ts](../../../gateway/src/config/services.config.ts)) ; `/equipments` exige un jeton. Les équipements ont des identifiants UUID non devinables. equipment-service ne connaît pas les affectations, qui sont dans assignment-service (routes protégées par jeton et permission). La fiche complète existe déjà sur `/equipments/:id`, derrière la connexion. Le frontend est en React avec `react-router-dom` et aucune bibliothèque de QR.

Décisions déjà prises avec le demandeur : fiche publique complète, prix et fournisseur masqués ; scan par l'appareil photo, scanner intégré et impression d'étiquettes. Voir proposal.md pour la motivation.

## Goals / Non-Goals

**Goals:**
- Un scan mène à une fiche lisible sur téléphone, sans compte.
- Aucune donnée financière ni interne sur la route publique.
- Les étiquettes restent valables même si l'application change de serveur ou de version.

**Non-Goals:**
- Modifier un équipement depuis la fiche publique.
- Jetons de partage à durée limitée ou révocables.
- Codes QR pour les utilisateurs, départements ou postes.
- Mode hors ligne du scanner.

## Decisions

**1. Le QR encode l'URL publique `<PUBLIC_APP_URL>/e/<id>`, pas un texte propriétaire.**
Un QR contenant une URL est lu par n'importe quel téléphone, sans application, ce qui répond au scan par appareil photo. L'identifiant UUID existant est réutilisé : pas de nouvelle colonne ni de migration. L'adresse de base vient de la configuration (`VITE_PUBLIC_APP_URL`), avec repli sur l'origine courante. Alternative écartée : un jeton distinct par équipement, plus sûr (révocable) mais il ajoute une colonne, une régénération et une gestion, alors que les UUID ne se devinent pas.

**2. Route publique de lecture dédiée, avec liste blanche de champs.**
`GET /public/equipments/:id` dans equipment-service, exposée par la passerelle avec `requiresAuth: false`. La réponse est construite champ par champ (liste blanche), jamais par copie de l'enregistrement, pour qu'une colonne ajoutée plus tard ne fuite pas. Alternative écartée : rendre `GET /equipments/:id` public, ce qui exposerait prix et fournisseur.

**3. Identifiant validé et réponse d'erreur uniforme.**
Un identifiant qui n'est pas un UUID reçoit la même réponse 404 qu'un identifiant inconnu, sans distinguer les deux. La passerelle applique une limite de débit propre à cette route (le limiteur existant, configuré plus large que pour l'authentification mais borné par IP).

**4. Le bénéficiaire vient d'une route interne d'assignment-service.**
equipment-service appelle une route interne (`/api/assignments/internal/active/:equipmentId`) qui ne renvoie que le type et le nom du bénéficiaire de l'affectation active. Elle n'utilise pas de jeton utilisateur mais un secret partagé entre services (en-tête `x-internal-token`, variable `INTERNAL_SERVICE_TOKEN`, comparaison à temps constant). Le secret est nécessaire parce que `docker-compose.yml` publie les ports de tous les services (par exemple 4004) : sans lui, la route serait joignable directement sans passer par la passerelle. Sans secret configuré, la route refuse toute requête. Si assignment-service est indisponible ou refuse, la fiche s'affiche avec « bénéficiaire indisponible » plutôt que d'échouer. Alternative écartée : route sans protection, exposée par les ports publiés.

**5. Génération de QR côté navigateur avec la bibliothèque `qrcode`.**
Le QR est du SVG/canvas produit sur place : aucune donnée n'est envoyée à un service tiers et la planche d'impression n'a pas besoin de serveur. Alternative écartée : image générée par le serveur, qui ajouterait un endpoint et une dépendance sans bénéfice.

**6. Étiquettes par une page dédiée et les styles d'impression.**
Une page `/equipments/labels` reçoit les identifiants sélectionnés, affiche une grille d'étiquettes et utilise `@media print` pour masquer la navigation. Elle réutilise la sélection multiple existante (`equipmentSelection.ts`). Pour les imports, la réponse d'import contient déjà `equipments` : le bouton « Imprimer les étiquettes » de la modale transmet ces identifiants.

**7. Scanner intégré avec `html5-qrcode`.**
Il fonctionne sur les navigateurs sans `BarcodeDetector` (Safari, Firefox). Il exige HTTPS (contrainte de `getUserMedia`), sauf sur `localhost`. Le contenu lu est analysé : si c'est une URL `/e/<uuid>` de l'application, on navigue vers `/equipments/:id` ; sinon message « code non reconnu ». Repli manuel : saisie du numéro de série, qui utilise la recherche déjà disponible.

**8. Page publique sans dépendance à la session.**
La route `/e/:id` est hors de la mise en page authentifiée. Elle lit `localStorage` pour savoir si un jeton existe, uniquement pour afficher le lien vers la fiche complète ; elle n'appelle jamais d'API protégée.

## Risks / Trade-offs

- [Fiche publique : toute personne qui photographie une étiquette voit responsable, série et emplacement] → prix, fournisseur et notes exclus, liste blanche de champs, limite de débit ; si l'exposition du nom du bénéficiaire pose problème, il suffit de retirer ce champ de la liste blanche.
- [Énumération d'identifiants] → UUID v4 non devinables, réponse uniforme, limitation de débit.
- [Étiquettes imprimées puis changement d'adresse publique] → l'URL est fixée à l'impression ; documenter que changer `PUBLIC_APP_URL` invalide les étiquettes existantes, ou garder l'ancien domaine en redirection.
- [Caméra indisponible en HTTP] → message explicite et saisie manuelle du numéro de série.
- [Dépendance à changement 1] → sans état ni dates de service, ces champs sont simplement absents ; la fiche reste correcte.
- [Deux nouvelles dépendances frontend] → toutes deux sans service externe ; à figer dans `package-lock.json`.
