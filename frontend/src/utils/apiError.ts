// Extrait un message lisible d'une erreur axios (formats de réponse variables selon les services)
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: { message?: unknown; error?: { message?: unknown } } } })?.response?.data;
  const message = data?.message ?? data?.error?.message;
  return typeof message === 'string' && message ? message : fallback;
};

// Détails structurés d'une réponse d'erreur (ex. erreurs par ligne d'un import refusé)
export const getApiErrorDetails = (err: unknown): unknown =>
  (err as { response?: { data?: { details?: unknown } } })?.response?.data?.details;

// Les requêtes en `responseType: 'blob'` reçoivent aussi leurs erreurs sous forme de Blob : on le relit en JSON
export const getBlobErrorMessage = async (err: unknown, fallback: string): Promise<string> => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      const message = parsed?.message ?? parsed?.error?.message;
      if (typeof message === 'string' && message) return message;
    } catch {
      // corps non JSON : message par défaut
    }
    return fallback;
  }
  return getApiErrorMessage(err, fallback);
};
