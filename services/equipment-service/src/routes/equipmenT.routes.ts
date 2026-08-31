import { Router } from "express";
import { equipmentController } from "../controllers/equipment.controller";
import { validate } from "../middlewares/validate";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  transferEquipmentSchema,
} from "../validators/equipment.validator";

const router = Router();

/**
 * @openapi
 * /api/equipments:
 *   post:
 *     summary: Créer un nouvel équipement
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEquipmentDTO'
 *     responses:
 *       201:
 *         description: Équipement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Equipment' }
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Non authentifié
 */
router.post("/", validate(createEquipmentSchema), equipmentController.create);

/**
 * @openapi
 * /api/equipments:
 *   get:
 *     summary: Lister tous les équipements
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des équipements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Equipment' }
 *       401:
 *         description: Non authentifié
 */
router.get("/", equipmentController.getAll);

/**
 * @openapi
 * /api/equipments/{id}:
 *   get:
 *     summary: Récupérer un équipement par son ID
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Équipement trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Equipment' }
 *       404:
 *         description: Équipement introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/:id", equipmentController.getById);

/**
 * @openapi
 * /api/equipments/{id}:
 *   patch:
 *     summary: Modifier un équipement
 *     tags: [Equipments]
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
 *             $ref: '#/components/schemas/UpdateEquipmentDTO'
 *     responses:
 *       200:
 *         description: Équipement mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Equipment' }
 *       404:
 *         description: Équipement introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.patch("/:id", validate(updateEquipmentSchema), equipmentController.update);

/**
 * @openapi
 * /api/equipments/{id}/transfer:
 *   post:
 *     summary: Transférer un équipement à un utilisateur ou un département
 *     tags: [Equipments]
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
 *             $ref: '#/components/schemas/TransferEquipmentDTO'
 *     responses:
 *       200:
 *         description: Transfert effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Equipment' }
 *       404:
 *         description: Équipement introuvable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/:id/transfer", validate(transferEquipmentSchema), equipmentController.transfer);

/**
 * @openapi
 * /api/equipments/{id}:
 *   delete:
 *     summary: Supprimer un équipement
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Équipement supprimé avec succès
 *       409:
 *         description: Équipement actuellement affecté, suppression impossible
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete("/:id", equipmentController.delete);

export default router;
