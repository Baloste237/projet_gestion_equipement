import { assignmentServiceClient } from "../clients/assignment-service.client";
import { HttpError } from "../errors/http-error";
import { equipmentRepository } from "../repositories/equipment.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Même réponse pour un identifiant mal formé et pour un identifiant inconnu : rien ne permet de les distinguer
const notFound = () => new HttpError(404, "Équipement introuvable");

/**
 * Fiche publique d'un équipement (accessible par scan du QR code, sans connexion).
 * Construite champ par champ : une colonne ajoutée plus tard à l'équipement n'est jamais exposée par accident.
 * Volontairement absents : prix d'achat, fournisseur, notes internes, date d'achat, identifiants d'affectation.
 */
export const publicSheetService = {
  get: async (id: string) => {
    if (!UUID.test(id)) throw notFound();
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) throw notFound();

    const assignee = await assignmentServiceClient.getPublicAssignee(equipment.id);
    return {
      name: equipment.name,
      category: equipment.category?.name ?? null,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      barcode: equipment.barcode,
      status: equipment.status,
      condition: equipment.condition,
      location: equipment.location,
      imageUrl: equipment.imageUrl,
      commissionedAt: equipment.commissionedAt,
      decommissionedAt: equipment.decommissionedAt,
      warrantyEndDate: equipment.warrantyEndDate,
      assignee,
    };
  },
};
