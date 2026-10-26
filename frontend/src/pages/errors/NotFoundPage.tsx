import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasToken = Boolean(localStorage.getItem('token'));

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex items-center justify-center p-4 relative overflow-hidden font-body-md">
      {/* Background radial gradient and grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="max-w-lg w-full bg-surface-container/90 border border-outline-variant rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10 text-center backdrop-blur-md">
        {/* Error icon badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 text-primary mb-6 shadow-inner">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            wrong_location
          </span>
        </div>

        {/* Status code & title */}
        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-primary/20 text-primary border border-primary/30 uppercase mb-3">
          Erreur 404
        </span>
        <h1 className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface mb-3 tracking-tight">
          Page Introuvable
        </h1>

        <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed mb-6">
          La destination demandée n'existe pas ou l'adresse saisie dans la barre de navigation est incorrecte.
        </p>

        {/* Path debug pill */}
        <div className="bg-surface-container-lowest/80 border border-outline-variant/60 rounded-lg p-2.5 mb-8 text-left flex items-center gap-2 overflow-hidden">
          <span className="material-symbols-outlined text-on-surface-variant text-sm shrink-0">
            link_off
          </span>
          <span className="font-mono text-xs text-primary truncate">
            {location.pathname}
          </span>
        </div>

        {/* Action Buttons */}
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
            to={hasToken ? '/dashboard' : '/login'}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-sm font-semibold shadow-md transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              {hasToken ? 'dashboard' : 'login'}
            </span>
            <span>{hasToken ? 'Tableau de bord' : 'Connexion'}</span>
          </Link>
        </div>

        {/* Secondary helper link */}
        <div className="mt-8 pt-6 border-t border-outline-variant/40 text-xs text-on-surface-variant flex items-center justify-center gap-4">
          <Link to="/scan" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
            <span>Scanner un QR Code</span>
          </Link>
          <span>•</span>
          <Link to="/login" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">support</span>
            <span>Aide & Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
