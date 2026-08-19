import { Router } from "express";
import { inventoryController } from "../controllers/inventory.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { checkPermission } from "../middlewares/check-permission";
import {
  createInventorySchema,
  addInventoryItemSchema,
  checkInventoryItemSchema,
} from "../validators/inventory.validator";

const router = Router();

/**
 * @openapi
 * /inventories:
 *   post:
 *     summary: Créer une nouvelle campagne d'inventaire
 *     tags: [Inventories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryDTO'
 *     responses:
 *       201:
 *         description: Inventaire créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Inventory' }
 *       400:
 *         description: Données invalides
 */
router.post(
  "/",
  authenticate,
  checkPermission("inventory:create"),
  validate(createInventorySchema),
  inventoryController.create
);

/**
 * @openapi
 * /inventories:
 *   get:
 *     summary: Lister toutes les campagnes d'inventaire
 *     tags: [Inventories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des inventaires
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Inventory' }
 */
router.get("/", authenticate, inventoryController.getAll);

/**
 * @openapi
 * /inventories/{id}:
 *   get:
 *     summary: Récupérer un inventaire par son ID
 *     tags: [Inventories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Inventaire trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Inventory' }
 *       404:
 *         description: Inventaire introuvable
 */
router.get("/:id", authenticate, inventoryController.getById);

/**
 * @openapi
 * /inventories/{id}/items:
 *   post:
 *     summary: Ajouter un équipement à un inventaire
 *     tags: [Inventories]
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
 *             $ref: '#/components/schemas/AddInventoryItemDTO'
 *     responses:
 *       201:
 *         description: Élément ajouté à l'inventaire
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/InventoryItem' }
 *       404:
 *         description: Inventaire non trouvé
 */
router.post(
  "/:id/items",
  authenticate,
  checkPermission("inventory:create"),
  validate(addInventoryItemSchema),
  inventoryController.addItem
);

/**
 * @openapi
 * /inventories/items/{itemId}/check:
 *   patch:
 *     summary: Marquer un équipement comme vérifié dans l'inventaire
 *     tags: [Inventories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckInventoryItemDTO'
 *     responses:
 *       200:
 *         description: État de vérification mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/InventoryItem' }
 *       404:
 *         description: Élément d'inventaire non trouvé
 */
router.patch(
  "/items/:itemId/check",
  authenticate,
  checkPermission("inventory:create"),
  validate(checkInventoryItemSchema),
  inventoryController.checkItem
);

/**
 * @openapi
 * /inventories/{id}/complete:
 *   patch:
 *     summary: Clôturer une campagne d'inventaire
 *     tags: [Inventories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Inventaire clôturé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Inventory' }
 *       404:
 *         description: Inventaire non trouvé
 */
router.patch(
  "/:id/complete",
  authenticate,
  checkPermission("inventory:validate"),
  inventoryController.complete
);

export default router;
