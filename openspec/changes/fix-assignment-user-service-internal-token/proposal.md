# Proposal

## Why

Lors de la création d'une affectation, `assignment-service` appelle `user-service` pour valider le bénéficiaire (utilisateur, département ou poste) sans envoyer le jeton interne `x-internal-token`. `user-service` refuse ces appels avec un `401`, que `assignment-service` interprète comme une indisponibilité du service et renvoie un `503` au client — rendant toute création d'affectation impossible.

## What Changes

- Ajout d'un intercepteur Axios dans `assignment-service/src/clients/user-service.client.ts` pour injecter systématiquement l'en-tête `x-internal-token` sur chaque requête vers `user-service` (comme c'est déjà fait dans `equipment-service.client.ts` du même service).

## Capabilities

### New Capabilities

<!-- Aucune nouvelle capacité — correction d'un défaut d'implémentation interne. -->

### Modified Capabilities

<!-- Aucun changement de comportement observable côté API.
     Le fix est un alignement sur le contrat inter-services déjà documenté (secret interne).
     skip_specs: true est déclaré dans .openspec.yaml -->

## Impact

- **Fichier modifié** : `services/assignment-service/src/clients/user-service.client.ts`
- **Zéro changement d'API** : l'en-tête `x-internal-token` est déjà attendu par `user-service` ; seul l'appelant manquait de l'envoyer.
- **Pas de migration** : aucune donnée, aucune variable d'environnement nouvelle (la variable `INTERNAL_SERVICE_TOKEN` existe déjà dans le `.env` d'`assignment-service`).
- **Risque** : minimal — ajoute un en-tête sur des appels qui échouaient systématiquement ; ne modifie pas la logique de validation ni le comportement fonctionnel.
