import type { EquipmentStatus } from '../services/api';

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  AVAILABLE: 'Disponible',
  ASSIGNED: 'Assigné',
  IN_MAINTENANCE: 'En Maintenance',
  RETIRED: 'Hors Service',
  A_COMPLETER: 'À compléter',
};

export const EQUIPMENT_STATUSES = Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[];

// Valide une valeur venant de l'URL (?status=) : renvoie '' si elle n'est pas un statut connu
export const parseStatusParam = (value: string | null | undefined): EquipmentStatus | '' =>
  value && (EQUIPMENT_STATUSES as string[]).includes(value) ? (value as EquipmentStatus) : '';
