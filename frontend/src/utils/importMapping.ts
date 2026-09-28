// Logique pure de l'import d'équipements (validation du fichier, mapping des colonnes) : testable sans navigateur.

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const IMPORT_EXTENSIONS = ['.csv', '.xlsx'];

/** Champs d'un équipement acceptés par l'import (même liste que le backend, dans l'ordre d'affichage) */
export const IMPORT_FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  serialNumber: 'Numéro de série',
  barcode: 'Code-barres',
  brand: 'Marque',
  model: 'Modèle',
  location: 'Emplacement',
  purchaseDate: "Date d'achat",
  purchasePrice: "Prix d'achat",
  warrantyEndDate: 'Fin de garantie',
  notes: 'Notes',
  category: 'Catégorie',
  supplier: 'Fournisseur',
  quantity: 'Quantité',
};

export const fieldLabel = (field: string) => IMPORT_FIELD_LABELS[field] ?? field;

/** Un mapping associe l'en-tête d'une colonne du fichier à un champ ; '' = colonne non importée */
export type ColumnMapping = Record<string, string>;

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;

// Refuse avant tout envoi un fichier qui ne serait pas accepté par le serveur
export const validateImportFile = (file: { name: string; size: number }): string | null => {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (file.name.lastIndexOf('.') === -1 || !IMPORT_EXTENSIONS.includes(extension)) {
    return 'Format non pris en charge : choisissez un fichier .csv ou .xlsx.';
  }
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return `Fichier trop volumineux (${formatSize(file.size)}) : la taille maximale est de ${formatSize(MAX_IMPORT_FILE_BYTES)}.`;
  }
  return null;
};

// Point de départ du mapping : les colonnes reconnues par le serveur, les autres ignorées
export const initialMapping = (headers: string[], suggested: ColumnMapping): ColumnMapping =>
  Object.fromEntries(headers.map((header) => [header, suggested[header] ?? '']));

/**
 * Champs affectés à plusieurs colonnes : le serveur n'en garderait qu'une, l'utilisateur doit trancher.
 * Retourne, pour chaque en-tête concerné, l'autre colonne qui utilise déjà ce champ.
 */
export const findDuplicateFields = (mapping: ColumnMapping): Record<string, string> => {
  const firstHeaderByField = new Map<string, string>();
  const duplicates: Record<string, string> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    const first = firstHeaderByField.get(field);
    if (first === undefined) firstHeaderByField.set(field, header);
    else duplicates[header] = first;
  }
  return duplicates;
};

// Le serveur déduit le nom de « marque + modèle » s'il n'y a pas de colonne nom
export const hasNameSource = (mapping: ColumnMapping): boolean => {
  const fields = new Set(Object.values(mapping).filter(Boolean));
  return fields.has('name') || fields.has('brand') || fields.has('model');
};

// Le corps `mapping` envoyé à l'import : uniquement les colonnes associées à un champ
export const toMappingPayload = (mapping: ColumnMapping): ColumnMapping =>
  Object.fromEntries(Object.entries(mapping).filter(([, field]) => field));

export interface ImportRowError {
  row: number;
  message: string;
}

// Extrait la liste d'erreurs par ligne d'une réponse d'import refusé (details = [{ row, message }])
export const parseImportErrors = (details: unknown): ImportRowError[] => {
  if (!Array.isArray(details)) return [];
  return details.flatMap((item) => {
    if (item && typeof item === 'object' && typeof (item as ImportRowError).message === 'string') {
      const row = (item as ImportRowError).row;
      return [{ row: typeof row === 'number' ? row : 0, message: (item as ImportRowError).message }];
    }
    return [];
  });
};

export const exportFilename = (format: 'csv' | 'xlsx', now: Date = new Date()) =>
  `equipements-${now.toISOString().slice(0, 10)}.${format}`;
