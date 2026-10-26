import { Router } from "express";
import { auditLogController } from "../controllers/audit-log.controller";
import { authenticate } from "../middlewares/authenticate";
import { checkPermission } from "../middlewares/check-permission";
import { internalOnly } from "../middlewares/internal-only";

const router = Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Lister les journaux d'audit (liste complète, ou une page filtrée)
 *     description: |
 *       Sans `page` ni `pageSize`, renvoie tous les journaux dans `data` (format inchangé). Avec l'un des deux,
 *       renvoie une page dans `data`, un bloc `meta` (`total`, `page`, `pageSize`, `totalPages`) et un bloc
 *       `summary` : compteurs de **tout** le journal, sans tenir compte des filtres. Tri : plus récents d'abord, puis
 *       identifiant. Les journaux d'exemple ne sont jamais créés par un appel paginé ou filtré.
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100 }, description: 25 par défaut }
 *       - { in: query, name: q, schema: { type: string, maxLength: 100 }, description: Acteur, identifiant d'entité ou identifiant du journal (casse ignorée) }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [AUTHENTICATION, DATA_MUTATION, SYSTEM_EVENT] }
 *       - { in: query, name: date, schema: { type: string, example: "2026-10-02" }, description: Jour au format AAAA-MM-JJ (journée UTC) }
 *     responses:
 *       200:
 *         description: Liste complète (data seul) ou page (data, meta et summary)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AuditLog' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer, example: 96 }
 *                     page: { type: integer, example: 1 }
 *                     pageSize: { type: integer, example: 25 }
 *                     totalPages: { type: integer, example: 4 }
 *                 summary:
 *                   type: object
 *                   description: Compteurs de tout le journal (sans filtre)
 *                   properties:
 *                     total: { type: integer }
 *                     authCount: { type: integer }
 *                     mutationCount: { type: integer }
 *                     failedCount: { type: integer }
 *       400:
 *         description: Paramètre invalide (pageSize hors 1 à 100, catégorie inconnue, date invalide)
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes (audit:read)
 */
router.get("/", authenticate, checkPermission("audit:read"), auditLogController.getAll);

/**
 * @openapi
 * /audit-logs/{id}:
 *   get:
 *     summary: Récupérer un journal d'audit par ID
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Log d'audit trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/AuditLog' }
 *       404:
 *         description: Log d'audit introuvable
 */
router.get("/:id", authenticate, checkPermission("audit:read"), auditLogController.getById);

// Écriture réservée aux services (secret partagé) : sinon le journal d'audit serait falsifiable
router.post("/", internalOnly, auditLogController.create);

export default router;
