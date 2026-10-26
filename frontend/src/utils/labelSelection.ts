// Équipements à imprimer en étiquettes : transmis à la page d'étiquettes et conservés pour un rechargement de page.
// Logique pure (le stockage est fourni par l'appelant) : testable sans navigateur.

export const LABELS_STORAGE_KEY = 'labelEquipmentIds';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

// Aucune limite de taille n'est imposée ici : la liste peut être celle d'un import de plusieurs milliers de lignes
export const saveLabelIds = (storage: StorageLike, ids: string[]): void => {
  try {
    storage.setItem(LABELS_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Stockage indisponible (navigation privée...) : la liste reste transmise par la navigation
  }
};

export const loadLabelIds = (storage: StorageLike): string[] => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LABELS_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id !== '') : [];
  } catch {
    return [];
  }
};

// Ordre de la liste des équipements, doublons et identifiants inconnus écartés ; `missing` compte les inconnus
export const pickForLabels = <T extends { id: string }>(equipments: T[], ids: string[]) => {
  const wanted = new Set(ids);
  const picked = equipments.filter((e) => wanted.has(e.id));
  return { picked, missing: wanted.size - picked.length };
};
