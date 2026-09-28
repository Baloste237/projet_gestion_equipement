// Extrait un message lisible d'une erreur axios (formats de réponse variables selon les services)
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: { message?: unknown; error?: { message?: unknown } } } })?.response?.data;
  const message = data?.message ?? data?.error?.message;
  return typeof message === 'string' && message ? message : fallback;
};
