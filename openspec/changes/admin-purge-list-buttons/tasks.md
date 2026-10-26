# Tasks

## 1. Vérification du mot de passe administrateur (`auth-service`)

- [x] 1.1 Ajouter la route `POST /auth/verify-password` dans `auth-service` qui valide le mot de passe reçu (`{ password }`) contre le compte de l'utilisateur authentifié (via JWT `req.user.id`). Vérifier avec un test unitaire (`npm test` dans `services/auth-service`).

## 2. Nettoyage inter-services des affectations (`assignment-service`)

- [x] 2.1 Ajouter un endpoint interne `POST /api/assignments/internal/purge` dans `assignment-service` protégé par `x-internal-token` qui purge ou clôture toutes les affectations actives pour préparer la suppression d'équipements. Vérifier par test unitaire.

## 3. Endpoints de purge dans `equipment-service`

- [x] 3.1 Implémenter l'endpoint `POST /api/equipments/purge` dans `equipment-service` (réservé au rôle `ADMIN`, valide le mot de passe via `auth-service`, appelle la purge des affectations dans `assignment-service`, supprime tous les équipements et envoie l'événement `EQUIPMENT_LIST_PURGED` à `audit-service`). Vérifier avec `npm test` dans `services/equipment-service`.
- [x] 3.2 Implémenter l'endpoint `POST /api/categories/purge` dans `equipment-service` (réservé au rôle `ADMIN`, vérifie le mot de passe, vérifie que le nombre d'équipements est à 0 — renvoie 400 si des équipements existent —, supprime les catégories et envoie l'événement `CATEGORY_LIST_PURGED`). Vérifier avec `npm test`.

## 4. Endpoints de purge dans `user-service`

- [x] 4.1 Implémenter l'endpoint `POST /api/users/purge` dans `user-service` (réservé au rôle `ADMIN`, valide le mot de passe, supprime les utilisateurs sauf ceux ayant `role: 'ADMIN'` et le compte connecté, révoque leurs identifiants dans `auth-service`, et envoie `USER_LIST_PURGED` à `audit-service`). Vérifier avec `npm test` dans `services/user-service`.
- [x] 4.2 Implémenter les endpoints `POST /api/departments/purge` et `POST /api/positions/purge` dans `user-service` (réservés au rôle `ADMIN`, suppriment les entités avec détachement automatique des utilisateurs et journalisation d'audit). Vérifier avec `npm test`.

## 5. Frontend — Composant Modale & Intégration sur les listes

- [x] 5.1 Créer le composant réutilisable `frontend/src/components/common/ConfirmPasswordPurgeModal.tsx` avec champ mot de passe, validation du formulaire, bouton d'action destructrice et messages d'erreur explicites.
- [x] 5.2 Mettre à jour les méthodes du service d'API frontend (`frontend/src/services/api.ts`) pour intégrer les appels de purge avec vérification du mot de passe.
- [x] 5.3 Ajouter le bouton critique « Vider la liste » (affiché uniquement si `user?.role === 'ADMIN'`) et connecter la modale de confirmation sur :
  - La page des Équipements (`frontend/src/pages/equipments/EquipmentListPage.tsx` ou équivalent)
  - La page des Catégories (`frontend/src/pages/categories/CategoriesPage.tsx`)
  - La page des Utilisateurs (`frontend/src/pages/users/UsersPage.tsx`)
  - La page des Départements (`frontend/src/pages/departments/DepartmentsPage.tsx`)
  - La page des Postes (`frontend/src/pages/positions/PositionsPage.tsx`)

## 6. Vérification globale et validation fonctionnelle

- [x] 6.1 Démarrer les services et vérifier de bout en bout :
  - Un utilisateur non-admin ne voit pas les boutons de vidage.
  - La saisie d'un mot de passe incorrect est rejetée sans modifier les données.
  - La saisie du bon mot de passe purge la liste ciblée.
  - Le compte administrateur connecté n'est jamais supprimé lors de la purge des utilisateurs.
  - La purge des catégories est bloquée si des équipements existent encore.
  - Les événements correspondants sont visibles dans le journal d'audit (`/audit`).
