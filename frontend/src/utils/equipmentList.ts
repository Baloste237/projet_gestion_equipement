// Logique pure de la liste des équipements (paramètres envoyés au serveur, période en cours de saisie, tri).
import type { EquipmentListParams } from '../services/api';
import { checkPeriod, toApiBound } from './dateFr';
import type { EquipmentSortField, SortOrder } from './listParams';

/** Attente après la dernière frappe de la recherche avant de recharger la liste */
export const SEARCH_DEBOUNCE_MS = 300;

export interface EquipmentListState {
  page: number;
  pageSize: number;
  q: string;
  categoryId: string;
  status: string;
  sort: EquipmentSortField;
  order: SortOrder;
  /** Bornes déjà converties pour l'API (voir `evaluatePeriod`) */
  from?: string;
  to?: string;
}

export const toListParams = (state: EquipmentListState): EquipmentListParams => ({
  page: state.page,
  pageSize: state.pageSize,
  q: state.q,
  categoryId: state.categoryId,
  status: state.status,
  sort: state.sort,
  order: state.order,
  from: state.from,
  to: state.to,
});

export interface PeriodEvaluation {
  /** Message pour le champ « du » */
  fromError?: string;
  /** Message pour le champ « au » */
  toError?: string;
  /** Vrai quand la période peut être appliquée (valide ; champs vides = pas de période) */
  ready: boolean;
  /** Bornes pour l'API, quand `ready` est vrai */
  from?: string;
  to?: string;
}

const COMPLETE_DATE_LENGTH = 10; // jj/mm/AAAA

/**
 * Évalue la période saisie. Une saisie incomplète (« 01/1 ») n'est ni une erreur ni appliquée : l'utilisateur est
 * encore en train de taper. Une saisie complète mais impossible (« 31/02/2026 ») affiche un message et n'est pas
 * appliquée, donc la liste n'est pas rechargée.
 */
export const evaluatePeriod = (fromText: string, toText: string, field: EquipmentSortField): PeriodEvaluation => {
  const incomplete = (text: string) => text.trim() !== '' && text.trim().length < COMPLETE_DATE_LENGTH;
  if (incomplete(fromText) || incomplete(toText)) return { ready: false };

  const check = checkPeriod(fromText, toText);
  if (!check.valid) return { ready: false, fromError: check.fromError, toError: check.toError };

  return {
    ready: true,
    from: fromText.trim() ? (toApiBound(fromText, field, 'from') ?? undefined) : undefined,
    to: toText.trim() ? (toApiBound(toText, field, 'to') ?? undefined) : undefined,
  };
};

/** Clic sur un en-tête de date : le même champ inverse le sens, un autre champ commence par le plus récent. */
export const nextSort = (
  current: { sort: EquipmentSortField; order: SortOrder },
  clicked: EquipmentSortField
): { sort: EquipmentSortField; order: SortOrder } =>
  current.sort === clicked
    ? { sort: clicked, order: current.order === 'asc' ? 'desc' : 'asc' }
    : { sort: clicked, order: 'desc' };
