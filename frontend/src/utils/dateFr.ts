// Dates au format jj/mm/AAAA : masque de saisie, analyse stricte, conversions pour l'API et affichage.
// Logique pure, testable sans navigateur. Indépendant de la langue du navigateur (contrairement à un champ « date »).

export interface DateParts {
  day: number;
  month: number;
  year: number;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const pad2 = (value: string | number) => String(value).padStart(2, '0');

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (month: number, year: number) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/**
 * Masque de saisie : « 3112 » devient « 31/12 », « 31122026 » devient « 31/12/2026 ». Un texte collé avec des
 * séparateurs quelconques (« 1-1-2026 », « 1.1.2026 ») est reconnu et complété (« 01/01/2026 »).
 */
export const maskDateFr = (input: string): string => {
  const separators = /[/.\-\s]+/;
  const parts = input.trim().split(separators).map((part) => part.replace(/\D/g, '')).filter(Boolean);
  if (separators.test(input.trim()) && parts.length >= 3) {
    return `${pad2(parts[0].slice(0, 2))}/${pad2(parts[1].slice(0, 2))}/${parts[2].slice(0, 4)}`;
  }
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/** Analyse « jj/mm/AAAA » : jour et mois existants, années bissextiles comprises ; `null` si le texte n'est pas une date. */
export const parseDateFr = (text: string): DateParts | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(month, year)) return null;
  return { day, month, year };
};

/** « 31/12/2026 » vers « 2026-12-31 » (date sans heure, comme l'attend l'API pour les dates d'achat et de mise en service). */
export const toIsoDate = (text: string): string | null => {
  const parts = parseDateFr(text);
  return parts ? `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}` : null;
};

/** Début de la journée **locale** saisie, en date-heure ISO (pour les horodatages : date d'ajout, dernière modification). */
export const startOfLocalDayIso = (text: string): string | null => {
  const parts = parseDateFr(text);
  return parts ? new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0).toISOString() : null;
};

/** Fin de la journée **locale** saisie (23:59:59.999), en date-heure ISO. */
export const endOfLocalDayIso = (text: string): string | null => {
  const parts = parseDateFr(text);
  return parts ? new Date(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999).toISOString() : null;
};

/** Dates enregistrées avec une heure (horodatages) ; les autres sont des dates seules, enregistrées à minuit UTC. */
export const TIMESTAMP_FIELDS = ['createdAt', 'updatedAt'] as const;
export const isTimestampField = (field: string): boolean => (TIMESTAMP_FIELDS as readonly string[]).includes(field);

/**
 * Borne de période pour l'API : journée locale en date-heure ISO pour un horodatage (un équipement ajouté à 00h30
 * heure locale reste dans cette journée), « AAAA-MM-JJ » pour une date seule.
 */
export const toApiBound = (text: string, field: string, bound: 'from' | 'to'): string | null => {
  if (!isTimestampField(field)) return toIsoDate(text);
  return bound === 'from' ? startOfLocalDayIso(text) : endOfLocalDayIso(text);
};

/**
 * Affiche une date ISO en jj/mm/AAAA. Une date seule (minuit UTC) est lue en UTC pour ne pas reculer d'un jour dans un
 * fuseau négatif ; un horodatage est lu en heure locale, comme l'utilisateur le voit.
 */
export const formatDateFr = (value: string | null | undefined, field = 'createdAt'): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const utc = !isTimestampField(field);
  const day = utc ? date.getUTCDate() : date.getDate();
  const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  return `${pad2(day)}/${pad2(month)}/${year}`;
};

export interface PeriodCheck {
  /** Message pour le champ « du » */
  fromError?: string;
  /** Message pour le champ « au » */
  toError?: string;
  /** Vrai quand la période peut être envoyée au serveur (champs vides acceptés) */
  valid: boolean;
}

const INVALID_DATE = 'Date invalide (jj/mm/AAAA)';

/** Contrôle de la période saisie, sans interroger le serveur : dates existantes, « au » non antérieur à « du ». */
export const checkPeriod = (fromText: string, toText: string): PeriodCheck => {
  const result: PeriodCheck = { valid: true };
  const from = fromText.trim() ? parseDateFr(fromText) : undefined;
  const to = toText.trim() ? parseDateFr(toText) : undefined;
  if (from === null) result.fromError = INVALID_DATE;
  if (to === null) result.toError = INVALID_DATE;
  if (from && to) {
    const key = (d: DateParts) => d.year * 10000 + d.month * 100 + d.day;
    if (key(to) < key(from)) result.toError = 'La date de fin est antérieure à la date de début';
  }
  result.valid = !result.fromError && !result.toError;
  return result;
};
