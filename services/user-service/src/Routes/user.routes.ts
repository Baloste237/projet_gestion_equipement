import { Router } from "express";
import { userController } from "../Controllers/user.controller";
import { validate } from "../middlewares/validate";
import {
  createUserSchema,
  updateProfileSchema,
  updateRoleSchema,
} from "../validators/user.validator";
import { uploadAvatar } from "../Config/upload";

const router = Router();

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
router.post("/", validate(createUserSchema), userController.create);

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
router.patch("/:id", validate(updateProfileSchema), userController.updateProfile);

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
router.post("/:id/avatar", uploadAvatar.single("avatar"), userController.uploadAvatar);

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
router.patch("/:id/role", validate(updateRoleSchema), userController.updateRole);

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
router.patch("/:id/deactivate", userController.deactivate);

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
router.patch("/:id/reactivate", userController.reactivate);

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
router.delete("/:id", userController.delete);

export default router;
