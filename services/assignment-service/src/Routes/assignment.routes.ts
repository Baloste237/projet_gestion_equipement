import { Router } from "express";
import { assignmentController } from "../controllers/assignment.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { checkPermission } from "../middlewares/check-permission";
import {
  createAssignmentSchema,
  createTransferSchema,
  createReturnSchema,
} from "../validators/assignment.validator";

const router = Router();

/**
 * @openapi
 * /api/assignments:
 *   post:
 *     summary: Créer une nouvelle affectation d'équipement
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentDTO'
 *     responses:
 *       201:
 *         description: Affectation créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Assignment' }
 *       400:
 *         description: Équipement déjà affecté ou données invalides
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes (assignment:create)
 */
router.post(
  "/",
  authenticate,
  checkPermission("assignment:create"),
  validate(createAssignmentSchema),
  assignmentController.create
);

/**
 * @openapi
 * /api/assignments:
 *   get:
 *     summary: Lister toutes les affectations
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des affectations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Assignment' }
 *       401:
 *         description: Non authentifié
 */
router.get("/", authenticate, checkPermission("assignment:read"), assignmentController.getAll);

/**
 * @openapi
 * /api/assignments/{id}:
 *   get:
 *     summary: Récupérer une affectation par ID
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Affectation trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Assignment' }
 *       404:
 *         description: Affectation introuvable
 */
router.get("/:id", authenticate, assignmentController.getById);

/**
 * @openapi
 * /api/assignments/{id}/transfer:
 *   post:
 *     summary: Transférer un équipement affecté à un autre utilisateur
 *     tags: [Assignments]
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
 *             $ref: '#/components/schemas/CreateTransferDTO'
 *     responses:
 *       200:
 *         description: Transfert effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Assignment' }
 *       404:
 *         description: Affectation introuvable
 */
router.post(
  "/:id/transfer",
  authenticate,
  checkPermission("assignment:transfer"),
  validate(createTransferSchema),
  assignmentController.transfer
);

/**
 * @openapi
 * /api/assignments/{id}/return:
 *   post:
 *     summary: Enregistrer la restitution d'un équipement
 *     tags: [Assignments]
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
 *             $ref: '#/components/schemas/CreateReturnDTO'
 *     responses:
 *       200:
 *         description: Restitution enregistrée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Assignment' }
 *       404:
 *         description: Affectation introuvable
 */
router.post(
  "/:id/return",
  authenticate,
  checkPermission("assignment:return"),
  validate(createReturnSchema),
  assignmentController.return
);

export default router;
