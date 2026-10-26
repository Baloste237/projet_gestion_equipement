// L'utilisateur connecté est conservé dans localStorage ; sert seulement à afficher ou masquer des boutons,
// le serveur reste l'autorité et refuse (403) toute écriture d'un non-administrateur.
export const isAdminUser = (raw: string | null | undefined): boolean => {
  try {
    return JSON.parse(raw || '{}')?.role === 'ADMIN';
  } catch {
    return false;
  }
};

export const readIsAdmin = (): boolean => {
  try {
    return isAdminUser(localStorage.getItem('user'));
  } catch {
    return false;
  }
};
