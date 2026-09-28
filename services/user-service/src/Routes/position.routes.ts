import { Router } from "express";
import { positionController } from "../Controllers/position.controller";
import { validate } from "../middlewares/validate";
import { createPositionSchema, updatePositionSchema } from "../validators/position.validator";

const router = Router();

/**
 * @openapi
 * /api/positions:
 *   post:
 *     summary: Créer un poste
 *     description: |
 *       Ouvert à tout utilisateur authentifié (l'authentification est assurée par la gateway).
 *       Le nom doit être unique, sans tenir compte de la casse, au sein du département.
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, departmentId]
 *             properties:
 *               name: { type: string, minLength: 2, example: Technicien réseau }
 *               description: { type: string, nullable: true }
 *               departmentId: { type: string, format: uuid }
 *               status: { type: string, enum: [ACTIF, INACTIF] }
 *               isActive: { type: boolean }
 *     responses:
 *       201:
 *         description: Poste créé
 *       400:
 *         description: Données invalides ou département inexistant (DEPARTMENT_NOT_FOUND)
 *       409:
 *         description: Nom déjà utilisé dans ce département (POSITION_NAME_CONFLICT)
 */
router.post("/", validate(createPositionSchema), positionController.create);

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

/**
 * @openapi
 * /api/positions/{id}:
 *   patch:
 *     summary: Modifier un poste
 *     description: Un poste passé à INACTIF n'est plus proposé pour de nouvelles affectations.
 *     tags: [Positions]
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
 *               name: { type: string, minLength: 2 }
 *               description: { type: string, nullable: true }
 *               departmentId: { type: string, format: uuid }
 *               status: { type: string, enum: [ACTIF, INACTIF] }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Poste modifié
 *       400:
 *         description: Données invalides ou département inexistant
 *       404:
 *         description: Poste introuvable
 *       409:
 *         description: Nom déjà utilisé dans ce département
 */
router.patch("/:id", validate(updatePositionSchema), positionController.update);

/**
 * @openapi
 * /api/positions/{id}:
 *   delete:
 *     summary: Supprimer un poste
 *     description: |
 *       Refusé (409) si le poste a une affectation active, ou (503) si le service d'affectation
 *       ne peut pas être interrogé. Les utilisateurs rattachés n'ont plus de poste.
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
 *         description: Poste supprimé
 *       404:
 *         description: Poste introuvable
 *       409:
 *         description: Des équipements sont encore affectés à ce poste (POSITION_HAS_ACTIVE_ASSIGNMENTS)
 *       503:
 *         description: Service d'affectation indisponible (ASSIGNMENT_SERVICE_UNAVAILABLE)
 */
router.delete("/:id", positionController.delete);

export default router;
