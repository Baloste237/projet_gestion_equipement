import { Router } from "express";
import { equipmentController } from "../controllers/equipment.controller";
import { validate } from "../middlewares/validate";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  transferEquipmentSchema,
} from "../validators/equipment.validator";
import { uploadEquipmentImage, uploadImportFile } from "../config/upload";

const router = Router();

/**
 * @openapi
 * /api/equipments/import:
 *   post:
 *     summary: Importer des équipements depuis un fichier CSV ou Excel
 *     description: |
 *       Les en-têtes courants (NOM, NUMERO DE SERIE, CODE BAR, MARQUE, MODELE, EMPLACEMENT, DATE ACHAT,
 *       PRIX, FIN GARANTIE, CATEGORIE, FOURNISSEUR, QUANTITE…) sont reconnus automatiquement ;
 *       `mapping` permet d'associer d'autres en-têtes. Une ligne de QUANTITE N crée N équipements.
 *       Sans numéro de série ou catégorie, un numéro TMP-… est généré et le statut vaut A_COMPLETER.
 *       L'import est atomique : aucune ligne n'est enregistrée si le fichier contient une erreur.
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier .csv (séparateur , ou ;) ou .xlsx, 5 Mo max
 *               mapping:
 *                 type: string
 *                 description: 'JSON { "En-tête du fichier": "champ" }. Champs : name, serialNumber, barcode, brand, model, location, purchaseDate, purchasePrice, warrantyEndDate, notes, category, supplier, quantity'
 *                 example: '{"Réf. constructeur": "serialNumber", "Site": "location"}'
 *     responses:
 *       201:
 *         description: Équipements créés (createdCount, toCompleteCount, mapping, equipments)
 *       400:
 *         description: Fichier manquant, illisible ou lignes invalides (détail par ligne dans `details`)
 */
router.post("/import", uploadImportFile.single("file"), equipmentController.importFile);

/**
 * @openapi
 * /api/equipments/export:
 *   get:
 *     summary: Exporter l'inventaire des équipements (CSV ou Excel)
 *     description: Les en-têtes sont ceux reconnus par l'import, le fichier peut donc être ré-importé.
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: false
 *         schema: { type: string, enum: [csv, xlsx], default: csv }
 *     responses:
 *       200:
 *         description: Fichier téléchargé (CSV séparé par « ; » en UTF-8, ou classeur .xlsx)
 *         content:
 *           text/csv: {}
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
router.get("/export", equipmentController.exportFile);

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

/**
 * @openapi
 * /api/equipments/{id}/image:
 *   post:
 *     summary: Téléverser l'image d'un équipement
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image téléversée avec succès
 *       400:
 *         description: Fichier manquant ou invalide
 *       404:
 *         description: Équipement introuvable
 */
router.post("/:id/image", uploadEquipmentImage.single("image"), equipmentController.uploadImage);

export default router;
