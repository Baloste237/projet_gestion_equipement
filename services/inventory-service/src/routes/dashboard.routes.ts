import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/check-permission";

const router = Router();

/**
 * @openapi
 * /api/dashboard/kpis:
 *   get:
 *     summary: KPIs temps réel du tableau de bord
 *     description: |
 *       Compteurs matérialisés, mis à jour à chaque événement RabbitMQ (exchange `equipment.events`)
 *       émis par equipment-service et assignment-service. Aucun recalcul n'est fait à la lecture.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs courants
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 equipments:
 *                   total: 8
 *                   byStatus: { AVAILABLE: 5, ASSIGNED: 2, A_COMPLETER: 1 }
 *                   byCategory: [{ categoryId: "c0ffee00-0000-4000-8000-000000000000", name: "Ordinateurs", total: 4, available: 2 }]
 *                 assignments:
 *                   active: 2
 *                   byAssigneeType: { USER: 1, DEPARTMENT: 1, POSITION: 0 }
 *                 inventories: { inProgress: 1 }
 *                 synchronized: true
 *                 updatedAt: "2026-09-27T14:00:00.000Z"
 *       401:
 *         description: Authentification requise
 */
router.get("/kpis", authenticate, dashboardController.getKpis);

/**
 * @openapi
 * /api/dashboard/kpis/rebuild:
 *   post:
 *     summary: Recalculer tous les KPIs depuis equipment-service et assignment-service
 *     description: À utiliser si des événements ont été perdus (RabbitMQ indisponible lors d'une modification).
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compteurs recalculés (equipmentCount, activeAssignmentCount)
 *       403:
 *         description: Réservé aux administrateurs
 *       503:
 *         description: equipment-service ou assignment-service indisponible
 */
router.post("/kpis/rebuild", authenticate, requireRole("ADMIN"), dashboardController.rebuildKpis);

export default router;
