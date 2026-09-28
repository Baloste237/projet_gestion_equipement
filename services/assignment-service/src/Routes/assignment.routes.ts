import { Router } from "express";
import { assignmentController } from "../Controllers/assignment.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { checkPermission } from "../middlewares/check-permission";
import {
  createAssignmentSchema,
  createBulkAssignmentSchema,
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
 * /api/assignments/bulk:
 *   post:
 *     summary: Affecter plusieurs équipements à un même bénéficiaire (tout ou rien)
 *     description: |
 *       Affecte de 1 à 200 équipements à un utilisateur, un département ou un poste. Le bénéficiaire doit être actif
 *       et chaque équipement doit exister et être disponible : sinon **aucune** affectation n'est créée et la réponse
 *       409 `BULK_ASSIGNMENT_REFUSED` liste chaque équipement refusé (`details`, raison `NOT_FOUND` ou `NOT_AVAILABLE`).
 *       Les affectations sont enregistrées ensemble ; un équipement ne peut avoir qu'une affectation active
 *       (conflit : 409 `EQUIPMENT_ALREADY_ASSIGNED`). Si le passage des équipements à ASSIGNED échoue, les affectations
 *       créées sont supprimées (503). Une entrée d'audit `ASSIGNMENTS_CREATED` est enregistrée pour l'opération.
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assigneeType, assigneeId, equipmentIds]
 *             properties:
 *               assigneeType: { type: string, enum: [USER, DEPARTMENT, POSITION] }
 *               assigneeId: { type: string, format: uuid }
 *               equipmentIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 items: { type: string, format: uuid }
 *               expectedReturnDate: { type: string, example: "2026-12-31" }
 *               handoverCondition: { type: string, example: GOOD }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Affectations créées (count, assignments)
 *       400:
 *         description: Liste vide, de plus de 200 équipements, avec doublon, ou données invalides
 *       401:
 *         description: Non authentifié
 *       409:
 *         description: Équipements refusés (BULK_ASSIGNMENT_REFUSED) ou déjà affecté (EQUIPMENT_ALREADY_ASSIGNED)
 *       503:
 *         description: Service équipement ou utilisateur indisponible (rien n'est conservé)
 */
router.post(
  "/bulk",
  authenticate,
  checkPermission("assignment:create"),
  validate(createBulkAssignmentSchema),
  assignmentController.createBulk
);

/**
 * @openapi
 * /api/assignments:
 *   get:
 *     summary: Lister les affectations (filtres optionnels)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assigneeType
 *         required: false
 *         schema: { type: string, enum: [USER, DEPARTMENT, POSITION] }
 *       - in: query
 *         name: assigneeId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { type: string, enum: [ACTIVE, TRANSFERRED, RETURNED] }
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
 *       400:
 *         description: Filtres invalides
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
