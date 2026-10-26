import { getApiErrorMessage } from './apiError';

// Message affiché pour une erreur de la gestion des catégories : refus de droits dédié,
// sinon le message du serveur (nom déjà pris, catégorie utilisée par N équipements...) ou le texte par défaut
export const categoryErrorMessage = (err: unknown, fallback: string): string => {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) return 'Action réservée aux administrateurs.';
  return getApiErrorMessage(err, fallback);
};
