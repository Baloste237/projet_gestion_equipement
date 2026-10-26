// Contenu des codes QR d'équipement et lecture des codes scannés (logique pure, testable sans navigateur).
// Un QR encode l'adresse absolue de la fiche publique : n'importe quel téléphone l'ouvre sans application.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

/** Adresse publique de l'application : celle configurée (VITE_PUBLIC_APP_URL), sinon l'origine courante */
export const publicAppUrl = (configured: string | undefined, currentOrigin: string): string =>
  trimTrailingSlashes(configured?.trim() || currentOrigin);

/** Adresse de la fiche publique d'un équipement : c'est ce que le QR code contient */
export const equipmentQrUrl = (equipmentId: string, baseUrl: string): string =>
  `${trimTrailingSlashes(baseUrl)}/e/${equipmentId}`;

/**
 * Identifiant d'équipement contenu dans un texte scanné, ou null si ce n'est pas un QR d'équipement de l'application.
 * Le texte doit être une adresse `<base>/e/<uuid>` où `<base>` est l'une des adresses de l'application fournies
 * (adresse publique configurée, origine courante) : le QR d'un autre site est refusé.
 */
export const parseEquipmentQr = (scanned: string, appBaseUrls: string[]): string | null => {
  let url: URL;
  try {
    url = new URL(scanned.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  for (const base of appBaseUrls) {
    let baseUrl: URL;
    try {
      baseUrl = new URL(base);
    } catch {
      continue;
    }
    const prefix = `${trimTrailingSlashes(baseUrl.pathname)}/e/`;
    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(prefix)) continue;
    const id = url.pathname.slice(prefix.length);
    if (UUID.test(id)) return id.toLowerCase();
  }
  return null;
};

/** Nom du fichier image d'un QR téléchargé : d'après le numéro de série, nettoyé pour tout système de fichiers */
export const qrFilename = (serialNumber: string): string => {
  const safe = serialNumber.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `qr-${safe || 'equipement'}.png`;
};
