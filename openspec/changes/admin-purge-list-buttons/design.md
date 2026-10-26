# Design

## Context

L'application repose sur une architecture microservices (Node.js / Express / Prisma / PostgreSQL) couplée à une Gateway Express et un frontend React / Vite / Tailwind :
- `gateway` : vérifie le JWT utilisateur, transmet les en-têtes d'identité et route les requêtes vers les services.
- `auth-service` : gère les comptes (`Credential`), les mots de passe hachés (bcrypt) et les jetons JWT.
- `equipment-service` : gère les équipements, catégories et fournisseurs.
- `user-service` : gère les profils utilisateurs, départements et postes.
- `assignment-service` : gère le cycle de vie des affectations, retours et transferts d'équipements.
- `audit-service` : enregistre les journaux d'audit de sécurité et d'administration.

Voir `proposal.md` pour le contexte et la motivation.

## Goals / Non-Goals

**Goals :**
- Fournir un bouton d'action critique « Vider la liste » sur 5 vues : Équipements, Catégories, Utilisateurs, Départements et Postes.
- Restreindre l'action exclusivement au rôle `ADMIN` (côté UI et côté API).
- Exiger la saisie du mot de passe de l'administrateur connecté pour débloquer et valider la suppression.
- Résoudre proprement les dépendances relationnelles :
  - Clôturer/purger les affectations dans `assignment-service` avant de vider les équipements.
  - Bloquer le vidage des catégories si des équipements existent encore (respect des contraintes de clés étrangères).
  - Préserver impérativement le compte administrateur connecté et tous les comptes `ADMIN` lors du vidage des utilisateurs, avec synchronisation dans `auth-service`.
  - Détacher automatiquement les utilisateurs lors du vidage des départements ou des postes (`onDelete: SetNull`).
- Émettre un enregistrement d'audit détaillé vers `audit-service` pour chaque opération réussie.

**Non-Goals :**
- Bouton unique de remise à zéro totale de l'ensemble de l'application (le choix arrêté est d'avoir des boutons individuels par liste).
- Récupération ou corbeille (l'opération de purge est définitive et irréversible).

## Decisions

### 1. Vérification du mot de passe administrateur
- **Approche** : Ajout d'un endpoint `POST /auth/verify-password` dans `auth-service` accessible via le Gateway avec un jeton Bearer valide.
- **Payload** : `{ password: string }`.
- **Fonctionnement** : Compare le mot de passe fourni au hash stocké dans `Credential` via `bcrypt.compare`.
- **Alternative rejetée** : Vérifier le mot de passe dans chaque service métier (`equipment-service`, `user-service`). Rejeté car seul `auth-service` possède la table des `Credential` et les hashs bcrypt ; centraliser cette vérification dans `auth-service` préserve l'isolation des secrets.

### 2. Gestion des dépendances et intégrité relationnelle

```
[ Vider les Équipements ]
        |
        v
Appel interne à assignment-service (POST /internal/assignments/purge-all)
        |
        v
prisma.equipment.deleteMany()
        |
        v
Envoi Audit : EQUIPMENT_LIST_PURGED

[ Vider les Catégories ]
        |
        v
Vérification : prisma.equipment.count() === 0 ?
  -> NON : Erreur HTTP 400 ("Des équipements existent encore...")
  -> OUI : prisma.category.deleteMany() + Audit CATEGORY_LIST_PURGED

[ Vider les Utilisateurs ]
        |
        v
prisma.user.deleteMany({ where: { role: { not: "ADMIN" }, id: { not: currentUserId } } })
        |
        v
Appel interne à auth-service pour supprimer les credentials des utilisateurs supprimés
        |
        v
Envoi Audit : USER_LIST_PURGED
```

### 3. Modale Frontend réutilisable (`ConfirmPasswordPurgeModal`)
- Composant générique situé dans `frontend/src/components/common/ConfirmPasswordPurgeModal.tsx`.
- Props :
  - `isOpen: boolean`
  - `title: string` (ex: "Vider la liste des équipements")
  - `description: string` (avertissement sur l'irréversibilité)
  - `itemCount: number` (nombre d'éléments qui vont être supprimés)
  - `onConfirm: (password: string) => Promise<void>`
  - `onClose: () => void`
- Comportement :
  - Champ de saisie sécurisé de mot de passe (`type="password"`).
  - Bouton rouge de confirmation désactivé tant que le champ est vide.
  - Gestion du chargement (`loading`) et affichage des messages d'erreur inline si le mot de passe est incorrect.

### 4. Endpoints de Purge sur les microservices
- `equipment-service` :
  - `POST /api/equipments/purge` : protégé par `authenticate` + `requireRole("ADMIN")`.
  - `POST /api/categories/purge` : protégé par `authenticate` + `requireRole("ADMIN")`.
- `user-service` :
  - `POST /api/users/purge` : protégé par `authenticate` + `requireRole("ADMIN")`.
  - `POST /api/departments/purge` : protégé par `authenticate` + `requireRole("ADMIN")`.
  - `POST /api/positions/purge` : protégé par `authenticate` + `requireRole("ADMIN")`.
- `assignment-service` :
  - `POST /api/assignments/internal/purge` : protégé par secret interne (`x-internal-token`).

## Risks / Trade-offs

- **[Risque : Suppression accidentelle massive]**  
  *Mitigation* : Restriction stricte au rôle `ADMIN` + modale avec mot de passe obligatoire.
- **[Risque : Déconnexion de l'administrateur en cours de purge]**  
  *Mitigation* : Le filtre de suppression dans `user-service` et `auth-service` exclut explicitement l'identifiant du compte connecté (`id !== currentUserId`) et tous les utilisateurs ayant `role: "ADMIN"`.
- **[Risque : Échec de contrainte de clé étrangère (Catégories -> Équipements)]**  
  *Mitigation* : La purge des catégories vérifie au préalable l'absence d'équipements rattachés et renvoie un message clair et guidant en cas d'équipements existants.
- **[Risque : Échec réseau partiel lors de l'appel d'audit]**  
  *Mitigation* : L'appel à `audit-service` est exécuté en best-effort sans faire échouer la transaction principale si le service d'audit est temporairement indisponible, conformément aux standards existants du projet.
