import { Router } from "express";
import { departmentController } from "../Controllers/department.controller";
import { validate } from "../middlewares/validate";
import { requireRole } from "../middlewares/security";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/department.validator";

const router = Router();

/**
 * @openapi
 * /api/departments:
 *   post:
 *     summary: Créer un département
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentDTO'
 *     responses:
 *       201:
 *         description: Département créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Department' }
 */
router.post("/", requireRole("ADMIN"), validate(createDepartmentSchema), departmentController.create);

/**
 * @openapi
 * /api/departments:
 *   get:
 *     summary: Lister tous les départements
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des départements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Department' }
 */
router.get("/", departmentController.getAll);

/**
 * @openapi
 * /api/departments/{id}:
 *   get:
 *     summary: Récupérer un département par ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Département trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Department' }
 *       404:
 *         description: Département introuvable
 */
router.get("/:id", departmentController.getById);

/**
 * @openapi
 * /api/departments/{id}:
 *   patch:
 *     summary: Modifier un département
 *     tags: [Departments]
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
 *         description: Département modifié
 *       404:
 *         description: Département introuvable
 */
router.patch("/:id", requireRole("ADMIN"), validate(updateDepartmentSchema), departmentController.update);

/**
 * @openapi
 * /api/departments/{id}:
 *   delete:
 *     summary: Supprimer un département
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Département supprimé
 *       404:
 *         description: Département introuvable
 */
router.delete("/:id", requireRole("ADMIN"), departmentController.delete);

/**
 * @openapi
 * /api/departments/purge:
 *   post:
 *     summary: Vider la liste des départements (ADMIN uniquement)
 *     tags: [Departments]
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
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Départements supprimés avec succès
 *       401:
 *         description: Mot de passe incorrect
 *       403:
 *         description: Réservé au rôle ADMIN
 */
router.post("/purge", requireRole("ADMIN"), departmentController.purge);

export default router;
