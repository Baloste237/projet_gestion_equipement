import type { BulkRefusal, Equipment } from '../services/api';

// Logique pure de la sélection multiple d'équipements pour l'affectation groupée (testable sans navigateur).

/** Plafond par opération, identique à celui du serveur */
export const MAX_BULK_ASSIGNMENTS = 200;

type SelectableEquipment = Pick<Equipment, 'id' | 'status'>;

/** Seuls les équipements disponibles peuvent être affectés */
export const isSelectable = (equipment: Pick<Equipment, 'status'>): boolean => equipment.status === 'AVAILABLE';

export const toggleSelection = (selected: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/** Ajoute à la sélection tous les équipements disponibles de la liste donnée (par exemple les résultats filtrés) */
export const selectAllSelectable = (equipments: SelectableEquipment[], selected: ReadonlySet<string>): Set<string> => {
  const next = new Set(selected);
  equipments.filter(isSelectable).forEach((e) => next.add(e.id));
  return next;
};

/** Retire de la sélection les équipements de la liste donnée (ne touche pas aux autres) */
export const deselectAll = (equipments: SelectableEquipment[], selected: ReadonlySet<string>): Set<string> => {
  const next = new Set(selected);
  equipments.forEach((e) => next.delete(e.id));
  return next;
};

export type SelectionState = 'none' | 'some' | 'all';

/** État de la case d'en-tête : « tout » quand tous les équipements sélectionnables de la liste sont retenus */
export const selectionState = (equipments: SelectableEquipment[], selected: ReadonlySet<string>): SelectionState => {
  const selectable = equipments.filter(isSelectable);
  if (selectable.length === 0) return 'none';
  const count = selectable.filter((e) => selected.has(e.id)).length;
  if (count === 0) return 'none';
  return count === selectable.length ? 'all' : 'some';
};

/** Après un rafraîchissement : ne garde que les équipements encore existants et disponibles */
export const pruneSelection = (equipments: SelectableEquipment[], selected: ReadonlySet<string>): Set<string> => {
  const stillSelectable = new Set(equipments.filter(isSelectable).map((e) => e.id));
  return new Set([...selected].filter((id) => stillSelectable.has(id)));
};

export const exceedsLimit = (count: number): boolean => count > MAX_BULK_ASSIGNMENTS;

/** Recherche par nom ou numéro de série, sans tenir compte de la casse ni des espaces autour */
export const filterByQuery = <T extends { name: string; serialNumber: string }>(equipments: T[], query: string): T[] => {
  const q = query.trim().toLowerCase();
  if (!q) return equipments;
  return equipments.filter((e) => e.name.toLowerCase().includes(q) || e.serialNumber.toLowerCase().includes(q));
};

export const REFUSAL_REASON_LABELS: Record<BulkRefusal['reason'], string> = {
  NOT_FOUND: 'équipement introuvable',
  NOT_AVAILABLE: 'déjà affecté ou indisponible',
};

export const describeRefusal = (refusal: BulkRefusal): string => {
  const label = refusal.name
    ? `${refusal.name}${refusal.serialNumber ? ` (${refusal.serialNumber})` : ''}`
    : refusal.equipmentId;
  return `${label} : ${REFUSAL_REASON_LABELS[refusal.reason] ?? refusal.reason}`;
};

// Extrait la liste des équipements refusés d'une réponse d'erreur (details = [{ equipmentId, reason, ... }])
export const parseBulkRefusals = (details: unknown): BulkRefusal[] => {
  if (!Array.isArray(details)) return [];
  return details.flatMap((item) => {
    if (item && typeof item === 'object' && typeof (item as BulkRefusal).equipmentId === 'string') {
      const refusal = item as BulkRefusal;
      return [{ ...refusal, reason: refusal.reason === 'NOT_FOUND' ? 'NOT_FOUND' : 'NOT_AVAILABLE' } as BulkRefusal];
    }
    return [];
  });
};

export const successMessage = (count: number): string => `${count} équipement${count > 1 ? 's' : ''} affecté${count > 1 ? 's' : ''}`;
