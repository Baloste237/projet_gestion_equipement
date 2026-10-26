import { Router } from "express";
import { categoryController } from "../controllers/category.controller";
import { validate } from "../middlewares/validate";
import { requireRole } from "../middlewares/security";
import { uploadImportFile } from "../config/upload";
import { createCategorySchema, updateCategorySchema } from "../validators/category.validator";
import { purgeSchema } from "../validators/equipment.validator";

const router = Router();

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Créer une catégorie
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryDTO'
 *     responses:
 *       201:
 *         description: Catégorie créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Réservé au rôle ADMIN
 *       409:
 *         description: Une catégorie porte déjà ce nom (casse et espaces ignorés)
 */
router.post("/", requireRole("ADMIN"), validate(createCategorySchema), categoryController.create);

/**
 * @openapi
 * /api/categories/import:
 *   post:
 *     summary: Importer une liste de catégories (CSV ou Excel, réservé à l'ADMIN)
 *     description: >
 *       La première ligne contient les en-têtes. Colonne du nom obligatoire (NOM, CATEGORIE, CATEGORY, NAME ou
 *       LIBELLE), colonne DESCRIPTION facultative. Les catégories déjà existantes (casse ignorée) restent
 *       inchangées et sont comptées comme existantes ; une ligne invalide fait refuser tout l'import.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Rapport d'import
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     rowCount: { type: integer }
 *                     createdCount: { type: integer }
 *                     existingCount: { type: integer }
 *                     duplicateInFileCount: { type: integer }
 *                     existingNames: { type: array, items: { type: string } }
 *       400:
 *         description: Fichier absent, illisible, d'un autre format, sans colonne de nom, ou ligne invalide (détail par ligne)
 *       403:
 *         description: Réservé au rôle ADMIN
 */
router.post("/import", requireRole("ADMIN"), uploadImportFile.single("file"), categoryController.importFile);

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Lister toutes les catégories avec leur nombre d'équipements
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des catégories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Category' }
 */
router.get("/", categoryController.getAll);

/**
 * @openapi
 * /api/categories/{id}:
 *   get:
 *     summary: Récupérer une catégorie par ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Catégorie trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       404:
 *         description: Catégorie introuvable
 */
router.get("/:id", categoryController.getById);

/**
 * @openapi
 * /api/categories/{id}:
 *   patch:
 *     summary: Modifier une catégorie
 *     tags: [Categories]
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
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Catégorie modifiée
 *       403:
 *         description: Réservé au rôle ADMIN
 *       404:
 *         description: Catégorie introuvable
 *       409:
 *         description: Une autre catégorie porte déjà ce nom
 */
router.patch("/:id", requireRole("ADMIN"), validate(updateCategorySchema), categoryController.update);

/**
 * @openapi
 * /api/categories/{id}:
 *   delete:
 *     summary: Supprimer une catégorie sans équipement
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Catégorie supprimée
 *       403:
 *         description: Réservé au rôle ADMIN
 *       404:
 *         description: Catégorie introuvable
 *       409:
 *         description: Catégorie utilisée par des équipements (nombre dans details.equipmentCount)
 */
router.delete("/:id", requireRole("ADMIN"), categoryController.delete);

/**
 * @openapi
 * /api/categories/purge:
 *   post:
 *     summary: Vider toute la liste des catégories (ADMIN uniquement)
 *     description: |
 *       Supprime toutes les catégories à condition qu'aucun équipement n'y soit encore rattaché.
 *       Renvoie une erreur 400 si des équipements existent (il faut d'abord vider les équipements).
 *       Le mot de passe de l'administrateur est requis pour valider l'opération.
 *       L'action est journalisée dans audit-service (CATEGORY_LIST_PURGED).
 *     tags: [Categories]
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
 *         description: Catégories supprimées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer, description: Nombre de catégories supprimées }
 *       400:
 *         description: Des équipements sont encore rattachés à des catégories
 *       401:
 *         description: Mot de passe incorrect ou non authentifié
 *       403:
 *         description: Réservé au rôle ADMIN
 */
router.post("/purge", requireRole("ADMIN"), validate(purgeSchema), categoryController.purge);

export default router;
