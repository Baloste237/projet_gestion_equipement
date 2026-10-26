# Proposal

## Why

Sur le terrain, retrouver les informations d'un équipement demande de se connecter, chercher son nom ou son numéro de série, puis ouvrir sa fiche. La page de détail affiche déjà une icône de code QR, mais elle est décorative : aucun QR n'est généré ni scannable. Un QR collé sur chaque équipement permettrait, avec un simple scan, de voir ses informations et son responsable actuel.

## What Changes

- Chaque équipement a un code QR qui encode l'adresse de sa fiche publique.
- Une fiche publique, ouverte par scan sans connexion, affiche l'identification de l'équipement, son état, ses dates de service, son emplacement et son bénéficiaire actuel. Le prix d'achat et le fournisseur restent masqués, ainsi que les notes internes.
- Un service public en lecture seule fournit cette fiche ; il est limité en débit et répond de la même façon pour un équipement inconnu ou mal formé.
- Le QR s'affiche sur la fiche équipement et peut être téléchargé.
- Une page d'impression produit des planches d'étiquettes (QR, nom, numéro de série) pour les équipements sélectionnés, y compris tous ceux d'un import.
- Un scanner intégré à l'application, utilisant la caméra, ouvre la fiche complète d'un équipement pour un utilisateur connecté.

## Capabilities

### New Capabilities
- `equipment-public-sheet`: fiche publique en lecture seule d'un équipement, accessible sans connexion, avec les champs exposés et masqués.
- `equipment-qr-code`: génération, téléchargement et impression des QR codes, et scanner intégré à l'application.

### Modified Capabilities

Aucune.

## Impact

- equipment-service : endpoint public de lecture, validation d'identifiant, champs filtrés.
- assignment-service : route interne, non exposée sans authentification, donnant l'affectation active d'un équipement.
- gateway : route publique sans authentification, avec limitation de débit.
- Frontend : route publique `/e/:id`, composant QR, page d'étiquettes imprimables, scanner ; deux dépendances (génération de QR, lecture de QR par caméra).
- Configuration : adresse publique de l'application, à mettre dans le QR.
- Dépend du changement `import-assignee-and-service-fields` pour l'état et les dates de service ; sans lui, la fiche omet ces champs.
