import { Router } from "express";
import { positionController } from "../Controllers/position.controller";

const router = Router();

/**
 * @openapi
 * /api/positions:
 *   get:
 *     summary: Lister les postes
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         required: false
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des postes
 */
router.get("/", positionController.getAll);

/**
 * @openapi
 * /api/positions/{id}:
 *   get:
 *     summary: Récupérer un poste par ID
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Poste trouvé
 *       404:
 *         description: Poste introuvable
 */
router.get("/:id", positionController.getById);

export default router;
