import { publicAppUrl } from '../utils/qrCode';

/** Adresse encodée dans les QR codes : VITE_PUBLIC_APP_URL si elle est définie, sinon l'origine courante */
export const getPublicAppUrl = (): string => publicAppUrl(import.meta.env.VITE_PUBLIC_APP_URL, window.location.origin);

/** Adresses reconnues comme « de l'application » par le scanner (étiquettes imprimées avec une autre adresse comprises) */
export const getAppBaseUrls = (): string[] => [...new Set([getPublicAppUrl(), window.location.origin])];
