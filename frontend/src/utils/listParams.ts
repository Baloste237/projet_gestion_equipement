// Paramètres de requête des listes paginées : logique pure, testable sans réseau.

export type EquipmentSortField = 'createdAt' | 'purchaseDate' | 'commissionedAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

/** Date de tri des équipements : libellé affiché et champ envoyé au serveur (la même date sert à la période). */
export const EQUIPMENT_SORT_OPTIONS: { field: EquipmentSortField; label: string }[] = [
  { field: 'createdAt', label: "Date d'ajout" },
  { field: 'purchaseDate', label: "Date d'achat" },
  { field: 'commissionedAt', label: 'Date de mise en service' },
  { field: 'updatedAt', label: 'Dernière modification' },
];

export const sortFieldLabel = (field: EquipmentSortField): string =>
  EQUIPMENT_SORT_OPTIONS.find((option) => option.field === field)?.label ?? field;

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Les valeurs vides (chaîne vide ou espaces, `undefined`, `null`) sont omises : le serveur applique alors ses valeurs par défaut. */
export const cleanParams = (params: Record<string, string | number | null | undefined> = {}): Record<string, string | number> => {
  const cleaned: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) cleaned[key] = trimmed;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};
