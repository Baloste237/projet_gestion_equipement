import { Router } from "express";
import { auditLogController } from "../controllers/audit-log.controller";
import { authenticate } from "../middlewares/authenticate";
import { checkPermission } from "../middlewares/check-permission";

const router = Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Lister les journaux d'audit
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des logs d'audit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AuditLog' }
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

export default router;
