// Aide au scanner de QR codes : message adapté à la panne de caméra et recherche manuelle par numéro de série.
// Logique pure, testable sans navigateur ni caméra.

export type CameraProblem = 'INSECURE_CONTEXT' | 'PERMISSION_DENIED' | 'NO_CAMERA' | 'CAMERA_BUSY' | 'UNKNOWN';

const CAMERA_MESSAGES: Record<CameraProblem, string> = {
  INSECURE_CONTEXT:
    "La caméra n'est utilisable qu'en HTTPS (ou sur localhost). Ouvrez l'application à une adresse sécurisée, ou saisissez le numéro de série ci-dessous.",
  PERMISSION_DENIED:
    "L'accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur, ou saisissez le numéro de série ci-dessous.",
  NO_CAMERA: "Aucune caméra n'a été trouvée sur cet appareil. Saisissez le numéro de série ci-dessous.",
  CAMERA_BUSY:
    "La caméra est déjà utilisée par une autre application. Fermez-la, ou saisissez le numéro de série ci-dessous.",
  UNKNOWN: "La caméra n'a pas pu démarrer. Saisissez le numéro de série ci-dessous.",
};

// html5-qrcode renvoie tantôt une Error (`name`), tantôt une simple chaîne : on regarde les deux
export const classifyCameraError = (error: unknown, isSecureContext: boolean): CameraProblem => {
  if (!isSecureContext) return 'INSECURE_CONTEXT';
  const name = typeof error === 'object' && error !== null ? String((error as { name?: unknown }).name ?? '') : '';
  const text = `${name} ${typeof error === 'string' ? error : (error as { message?: string } | null)?.message ?? ''}`;
  if (/NotAllowed|Permission|denied/i.test(text)) return 'PERMISSION_DENIED';
  if (/NotFound|no camera|Requested device not found|OverconstrainedError/i.test(text)) return 'NO_CAMERA';
  if (/NotReadable|TrackStart|in use|busy/i.test(text)) return 'CAMERA_BUSY';
  return 'UNKNOWN';
};

export const cameraErrorMessage = (error: unknown, isSecureContext: boolean): string =>
  CAMERA_MESSAGES[classifyCameraError(error, isSecureContext)];

const normalizeSerial = (value: string) => value.trim().toLowerCase();

// Équipement dont le numéro de série correspond exactement (casse et espaces autour ignorés)
export const findBySerialNumber = <T extends { serialNumber: string }>(equipments: T[], typed: string): T | null => {
  const wanted = normalizeSerial(typed);
  if (!wanted) return null;
  return equipments.find((e) => normalizeSerial(e.serialNumber) === wanted) ?? null;
};
