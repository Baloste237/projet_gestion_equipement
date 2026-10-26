import { Router } from "express";
import { equipmentController } from "../controllers/equipment.controller";
import { validate } from "../middlewares/validate";
import { requireRole } from "../middlewares/security";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  transferEquipmentSchema,
  lookupEquipmentsSchema,
  batchStatusSchema,
  purgeSchema,
} from "../validators/equipment.validator";
import { uploadEquipmentImage, uploadImportFile, verifyImageContent } from "../config/upload";

const router = Router();

/**
 * @openapi
 * /api/equipments/import/preview:
 *   post:
 *     summary: Prévisualiser un fichier d'import (sans rien créer)
 *     description: |
 *       Lit le fichier .csv ou .xlsx et renvoie ses en-têtes, le nombre de lignes, les premières lignes et le
 *       mapping reconnu automatiquement (`suggestedMapping`, au format { "En-tête": "champ" } réutilisable tel quel
 *       comme `mapping` de POST /equipments/import). Aucun équipement n'est créé et le fichier n'est pas conservé.
 *
 *       Fichier d'inventaire : la ligne d'en-tête est détectée (un titre peut la précéder, `headerRow` donne son
 *       numéro), les lignes vides ou réduites à `()` sont ignorées (`ignoredRowCount`) et la lecture s'arrête à la
 *       ligne « LISTE DES VALEURS… ». Un montant suivi de F, FCFA, XAF ou CFA est lu avec « . » ou « , » comme séparateur
 *       de milliers (`19.500 F` = 19 500) et vaut prix unitaire ; sans nom, marque ni modèle, la catégorie sert de nom.
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
 *     responses:
 *       200:
 *         description: Aperçu (headers, headerRow, ignoredRowCount, rowCount, sampleRows, suggestedMapping, fields)
 *       400:
 *         description: Fichier manquant, illisible ou sans ligne de données
 */
router.post("/import/preview", uploadImportFile.single("file"), equipmentController.previewImport);

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
 *         description: Équipements créés (createdCount, toCompleteCount, headerRow, ignoredRowCount, mapping, equipments)
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
 * /api/equipments/purge:
 *   post:
 *     summary: Vider l'ensemble des équipements (Admin uniquement)
 *     tags: [Equipments]
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
 *         description: Liste des équipements vidée
 *       401:
 *         description: Mot de passe incorrect ou non authentifié
 *       403:
 *         description: Rôle ADMIN requis
 */
router.post("/purge", requireRole("ADMIN"), validate(purgeSchema), equipmentController.purge);

/**
 * @openapi
 * /api/equipments/lookup:
 *   post:
 *     summary: Lire plusieurs équipements en un appel
 *     description: |
 *       Renvoie les équipements trouvés (`id`, `name`, `serialNumber`, `status`). Les identifiants inconnus sont
 *       simplement absents de la réponse. Un POST évite la limite de longueur d'URL (200 identifiants au plus).
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Équipements trouvés
 *       400:
 *         description: Liste vide, trop longue, en double ou identifiant invalide
 */
router.post("/lookup", validate(lookupEquipmentsSchema), equipmentController.lookup);

/**
 * @openapi
 * /api/equipments/status/batch:
 *   post:
 *     summary: Changer le statut de plusieurs équipements, tout ou rien
 *     description: |
 *       Passe tous les équipements de `from` à `to` dans une seule transaction, seulement si **tous** sont au
 *       statut `from`. Sinon rien n'est modifié et la réponse 409 liste les équipements en défaut
 *       (`NOT_FOUND` ou `STATUS_MISMATCH`). Publie, pour chaque équipement, l'audit et l'événement de changement
 *       de statut habituels.
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, from, to]
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 items: { type: string, format: uuid }
 *               from: { type: string, enum: [AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, A_COMPLETER] }
 *               to: { type: string, enum: [AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, A_COMPLETER] }
 *     responses:
 *       200:
 *         description: Statuts modifiés (updatedCount, ids)
 *       400:
 *         description: Corps invalide
 *       409:
 *         description: Au moins un équipement introuvable ou pas au statut `from` (détail dans `details`)
 */
router.post("/status/batch", validate(batchStatusSchema), equipmentController.updateStatusBatch);

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
 *     summary: Lister les équipements (liste complète, ou une page triée et filtrée)
 *     description: |
 *       Sans `page` ni `pageSize`, renvoie **tous** les équipements dans `data` (format inchangé), triés par date
 *       d'ajout décroissante. Avec l'un des deux, renvoie une page dans `data` et un bloc `meta`
 *       (`total`, `page`, `pageSize`, `totalPages`) ; une page au-delà de la fin renvoie `data` vide.
 *
 *       Les dates égales (équipements d'un même import) sont départagées par identifiant : aucune ligne ne saute ni ne se
 *       répète d'une page à l'autre. Les équipements sans date de tri sont placés en fin de liste, dans les deux sens.
 *       Une période (`from`, `to`) porte sur la date de tri et exclut les équipements qui n'en ont pas ; une date
 *       `AAAA-MM-JJ` couvre toute la journée UTC, une date-heure ISO est prise telle quelle.
 *     tags: [Equipments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 }, description: Numéro de page (1 par défaut avec pageSize) }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100 }, description: Taille de page (25 par défaut avec page) }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [createdAt, purchaseDate, commissionedAt, updatedAt], default: createdAt }
 *         description: Date de tri (ajout, achat, mise en service, dernière modification)
 *       - { in: query, name: order, schema: { type: string, enum: [asc, desc], default: desc } }
 *       - { in: query, name: q, schema: { type: string, maxLength: 100 }, description: Recherche sur le nom, le numéro de série et la catégorie (casse ignorée) }
 *       - { in: query, name: categoryId, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string }, description: "Ex. AVAILABLE, ASSIGNED, A_COMPLETER" }
 *       - { in: query, name: from, schema: { type: string }, description: "Début de période (AAAA-MM-JJ ou date-heure ISO), sur la date de tri" }
 *       - { in: query, name: to, schema: { type: string }, description: "Fin de période incluse (AAAA-MM-JJ ou date-heure ISO), sur la date de tri" }
 *     responses:
 *       200:
 *         description: Liste complète (data seul) ou page (data et meta)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Equipment' }
 *                 meta:
 *                   type: object
 *                   description: Présent seulement pour une requête paginée
 *                   properties:
 *                     total: { type: integer, example: 620 }
 *                     page: { type: integer, example: 2 }
 *                     pageSize: { type: integer, example: 25 }
 *                     totalPages: { type: integer, example: 25 }
 *       400:
 *         description: Paramètre invalide (pageSize hors 1 à 100, champ de tri inconnu, date invalide, début postérieur à la fin)
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
router.post("/:id/image", uploadEquipmentImage.single("image"), verifyImageContent, equipmentController.uploadImage);

/**
 * @openapi
 * /api/equipments/purge:
 *   post:
 *     summary: Vider toute la liste des équipements (ADMIN uniquement)
 *     description: |
 *       Clôture préalablement toutes les affectations actives dans assignment-service (via token interne),
 *       puis supprime l'ensemble des équipements. Le mot de passe de l'administrateur est requis pour valider
 *       l'opération. L'action est journalisée dans audit-service (EQUIPMENT_LIST_PURGED).
 *     tags: [Equipments]
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
 *               password:
 *                 type: string
 *                 description: Mot de passe actuel de l'administrateur
 *     responses:
 *       200:
 *         description: Équipements supprimés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer, description: Nombre d'équipements supprimés }
 *       400:
 *         description: Mot de passe manquant
 *       401:
 *         description: Mot de passe incorrect ou non authentifié
 *       403:
 *         description: Réservé au rôle ADMIN
 */
router.post("/purge", requireRole("ADMIN"), validate(purgeSchema), equipmentController.purge);

export default router;
