import { Router } from "express";
import { departmentController } from "../Controllers/department.controller";
import { validate } from "../middlewares/validate";
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
router.post("/", validate(createDepartmentSchema), departmentController.create);

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
router.patch("/:id", validate(updateDepartmentSchema), departmentController.update);

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
router.delete("/:id", departmentController.delete);

export default router;
