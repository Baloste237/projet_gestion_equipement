import { Router } from "express";
import { supplierController } from "../Controllers/supplier.controller";
import { validate } from "../middlewares/validate";
import { createSupplierSchema, updateSupplierSchema } from "../validators/supplier.validator";

const router = Router();

/**
 * @openapi
 * /api/suppliers:
 *   post:
 *     summary: Créer un fournisseur
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSupplierDTO'
 *     responses:
 *       201:
 *         description: Fournisseur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Supplier' }
 *       400:
 *         description: Données invalides
 */
router.post("/", validate(createSupplierSchema), supplierController.create);

/**
 * @openapi
 * /api/suppliers:
 *   get:
 *     summary: Lister tous les fournisseurs
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des fournisseurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Supplier' }
 */
router.get("/", supplierController.getAll);

/**
 * @openapi
 * /api/suppliers/{id}:
 *   get:
 *     summary: Récupérer un fournisseur par ID
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fournisseur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Supplier' }
 *       404:
 *         description: Fournisseur introuvable
 */
router.get("/:id", supplierController.getById);

/**
 * @openapi
 * /api/suppliers/{id}:
 *   patch:
 *     summary: Modifier un fournisseur
 *     tags: [Suppliers]
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
 *               contactInfo: { type: string }
 *     responses:
 *       200:
 *         description: Fournisseur modifié
 *       404:
 *         description: Fournisseur introuvable
 */
router.patch("/:id", validate(updateSupplierSchema), supplierController.update);

/**
 * @openapi
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Supprimer un fournisseur
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fournisseur supprimé
 *       404:
 *         description: Fournisseur introuvable
 */
router.delete("/:id", supplierController.delete);

export default router;
