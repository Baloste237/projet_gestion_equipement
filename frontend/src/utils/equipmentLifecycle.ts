// État de fonctionnement et dates de service d'un équipement : libellés et règles de saisie (logique pure).
import type { EquipmentCondition } from '../services/api';

export const EQUIPMENT_CONDITIONS: EquipmentCondition[] = ['FONCTIONNEL', 'NON_FONCTIONNEL'];

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  FONCTIONNEL: 'Fonctionnel',
  NON_FONCTIONNEL: 'Non fonctionnel',
};

export const conditionLabel = (condition: string | null | undefined) =>
  EQUIPMENT_CONDITION_LABELS[(condition ?? 'FONCTIONNEL') as EquipmentCondition] ?? String(condition);

// Valeur d'un <input type="date"> (AAAA-MM-JJ) à partir d'une date ISO renvoyée par l'API
export const toDateInputValue = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

// Message d'erreur si la mise hors service précède la mise en service (dates AAAA-MM-JJ), sinon null
export const validateServiceDates = (commissionedAt: string, decommissionedAt: string): string | null =>
  commissionedAt && decommissionedAt && decommissionedAt < commissionedAt
    ? 'La date de mise hors service ne peut pas précéder la date de mise en service.'
    : null;

export const formatServiceDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—';
