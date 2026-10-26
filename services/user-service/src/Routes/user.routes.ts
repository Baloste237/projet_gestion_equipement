import { Router } from "express";
import { userController } from "../Controllers/user.controller";
import { validate } from "../middlewares/validate";
import { requireRole, requireOwnerOrAdmin } from "../middlewares/security";
import { userRepository } from "../Repositories/user.repository";
import {
  createUserSchema,
  updateProfileSchema,
  updateRoleSchema,
} from "../validators/user.validator";
import { uploadAvatar, verifyImageContent } from "../Config/upload";

const router = Router();

// Le jeton porte l'identifiant d'authentification (authUserId), pas celui du profil
const resolveOwner = async (profileId: string) => (await userRepository.findById(profileId))?.authUserId ?? null;

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Créer un profil utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserDTO'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Données invalides
 */
router.post("/", requireRole("ADMIN"), validate(createUserSchema), userController.create);

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Lister tous les utilisateurs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 */
router.get("/", userController.getAll);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Fiche de l'utilisateur connecté (retrouvée par l'identifiant de son compte)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fiche reliée au compte connecté
 *       404:
 *         description: Aucune fiche reliée à ce compte
 */
// Doit précéder /:id, sinon « me » serait lu comme un identifiant de fiche
router.get("/me", userController.me);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: Utilisateur introuvable
 */
router.get("/:id", userController.getById);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     summary: Mettre à jour le profil d'un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileDTO'
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *       404:
 *         description: Utilisateur introuvable
 */
router.patch("/:id", requireOwnerOrAdmin(resolveOwner), validate(updateProfileSchema), userController.updateProfile);

/**
 * @openapi
 * /api/users/{id}/avatar:
 *   post:
 *     summary: Téléverser la photo de profil (avatar)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar mis à jour avec succès
 *       400:
 *         description: Fichier manquant ou invalide
 */
router.post("/:id/avatar", requireOwnerOrAdmin(resolveOwner), uploadAvatar.single("avatar"), verifyImageContent, userController.uploadAvatar);

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     summary: Modifier le rôle ou le département d'un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleDTO'
 *     responses:
 *       200:
 *         description: Rôle/département mis à jour
 *       404:
 *         description: Utilisateur introuvable
 */
router.patch("/:id/role", requireRole("ADMIN"), validate(updateRoleSchema), userController.updateRole);

/**
 * @openapi
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Désactiver un compte utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Compte désactivé
 */
router.patch("/:id/deactivate", requireRole("ADMIN"), userController.deactivate);

/**
 * @openapi
 * /api/users/{id}/reactivate:
 *   patch:
 *     summary: Réactiver un compte utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Compte réactivé
 */
router.patch("/:id/reactivate", requireRole("ADMIN"), userController.reactivate);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 *       404:
 *         description: Utilisateur introuvable
 */
router.delete("/:id", requireRole("ADMIN"), userController.delete);

/**
 * @openapi
 * /api/users/purge:
 *   post:
 *     summary: Vider la liste des utilisateurs non-admin (ADMIN uniquement)
 *     description: |
 *       Supprime tous les utilisateurs dont le rôle n'est pas ADMIN, sauf le compte de l'administrateur
 *       actuellement connecté. Révoque leurs comptes dans auth-service. Requiert le mot de passe admin.
 *       L'action est journalisée (USER_LIST_PURGED).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 description: Mot de passe actuel de l'administrateur
 *     responses:
 *       200:
 *         description: Utilisateurs non-admin supprimés avec succès
 *       401:
 *         description: Mot de passe incorrect ou non authentifié
 *       403:
 *         description: Réservé au rôle ADMIN
 */
router.post("/purge", requireRole("ADMIN"), userController.purge);

export default router;
