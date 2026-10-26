import { Router } from "express";
import { publicSheetController } from "../controllers/public-sheet.controller";

const router = Router();

/**
 * @openapi
 * /api/public/equipments/{id}:
 *   get:
 *     summary: Fiche publique d'un équipement (scan du QR code, sans authentification)
 *     description: |
 *       Lecture seule, sans jeton. Contient l'identification, le statut, l'état de fonctionnement, l'emplacement,
 *       les dates de service, la fin de garantie et le bénéficiaire actuel. Le prix d'achat, le fournisseur et les
 *       notes internes ne sont jamais renvoyés. Un identifiant inconnu ou mal formé reçoit la même réponse 404.
 *     tags: [Equipments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fiche publique
 *       404:
 *         description: Équipement introuvable (ou identifiant mal formé)
 */
router.get("/equipments/:id", publicSheetController.get);

export default router;
