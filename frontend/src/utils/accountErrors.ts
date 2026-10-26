import { getApiErrorMessage } from './apiError';

// Message affiché pour une erreur de la gestion des comptes : textes dédiés aux refus connus,
// sinon le message du serveur (ou le texte par défaut)
export const accountErrorMessage = (err: unknown, fallback: string): string => {
  const response = (err as { response?: { status?: number; data?: { code?: string } } } | null)?.response;

  if (response?.data?.code === 'LAST_ADMIN') {
    return 'Impossible : il doit rester au moins un administrateur actif.';
  }
  if (response?.data?.code === 'ACCOUNT_ALREADY_LINKED') {
    return 'Ce compte de connexion est déjà relié à une autre fiche.';
  }
  if (response?.status === 502) {
    return "Synchronisation impossible avec le service d'authentification : rien n'a été modifié, réessayez plus tard.";
  }
  if (response?.status === 403) {
    return 'Action réservée aux administrateurs.';
  }
  return getApiErrorMessage(err, fallback);
};
