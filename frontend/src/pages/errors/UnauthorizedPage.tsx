import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface UnauthorizedPageProps {
  requiredRoles?: string[];
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ requiredRoles }) => {
  const navigate = useNavigate();

  let userRole = 'NON AUTHENTIFIÉ';
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      userRole = JSON.parse(raw)?.role || 'EMPLOYE';
    }
  } catch {
    userRole = 'NON AUTHENTIFIÉ';
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex items-center justify-center p-4 relative overflow-hidden font-body-md">
      {/* Background ambient accents */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-error/10 rounded-full blur-3xl pointer-events-none -top-20 -right-20" />
      <div className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none -bottom-20 -left-20" />

      <div className="max-w-lg w-full bg-surface-container/90 border border-outline-variant rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10 text-center backdrop-blur-md">
        {/* Warning lock icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-error/10 border border-error/30 text-error mb-6 shadow-inner">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield_lock
          </span>
        </div>

        {/* Status code & title */}
        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-error/20 text-error border border-error/30 uppercase mb-3">
          Erreur 403
        </span>
        <h1 className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface mb-3 tracking-tight">
          Accès Refusé
        </h1>

        <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed mb-6">
          Vous n'avez pas les privilèges nécessaires pour accéder à cette ressource. Cette section fait l'objet d'un contrôle d'accès strict.
        </p>

        {/* Role information card */}
        <div className="bg-surface-container-lowest/90 border border-outline-variant/60 rounded-xl p-4 mb-8 text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Votre profil actuel :</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-surface-variant text-on-surface border border-outline-variant">
              {userRole}
            </span>
          </div>

          {requiredRoles && requiredRoles.length > 0 && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/40">
              <span className="text-on-surface-variant font-medium">Rôles autorisés :</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {requiredRoles.map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/30"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-outline-variant bg-surface-container-high hover:bg-surface-variant text-on-surface text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Page précédente</span>
          </button>

          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-sm font-semibold shadow-md transition-colors"
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            <span>Tableau de bord</span>
          </Link>
        </div>

        {/* Change account / logout button */}
        <div className="mt-8 pt-6 border-t border-outline-variant/40 text-xs text-on-surface-variant flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleLogout}
            className="hover:text-error transition-colors flex items-center gap-1.5 font-medium"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Changer de compte utilisateur</span>
          </button>
        </div>
      </div>
    </div>
  );
};
