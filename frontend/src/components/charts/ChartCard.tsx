import React from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  /** Badge affiché à droite du titre (ex. total) */
  badge?: string;
  /** Contenu affiché à droite du titre à la place du badge (ex. onglets) */
  actions?: React.ReactNode;
  /** true : affiche `emptyMessage` au lieu du graphique */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Message d'erreur : remplace le graphique, sans jamais afficher de zéros trompeurs */
  errorMessage?: string | null;
  children: React.ReactNode;
}

// Conteneur commun des diagrammes : titre, description, état vide et état d'erreur
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  badge,
  actions,
  isEmpty = false,
  emptyMessage = 'Aucune donnée à représenter.',
  errorMessage,
  children,
}) => (
  <section className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-xl">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-outline-variant">
      <div>
        <h3 className="font-headline-sm text-base font-bold text-on-surface">{title}</h3>
        {description && <p className="text-xs text-on-surface-variant">{description}</p>}
      </div>
      {actions ??
        (badge && (
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/30 w-fit">
            {badge}
          </span>
        ))}
    </div>

    {errorMessage ? (
      <div role="alert" className="py-6 text-center text-xs text-red-400 flex flex-col items-center gap-1">
        <span className="material-symbols-outlined text-2xl">error</span>
        <span>{errorMessage}</span>
      </div>
    ) : isEmpty ? (
      <div className="py-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1">
        <span className="material-symbols-outlined text-3xl opacity-50">bar_chart</span>
        <span>{emptyMessage}</span>
      </div>
    ) : (
      children
    )}
  </section>
);

interface ChartDetailProps {
  text: string | null;
  placeholder?: string;
}

// Ligne de détail alimentée au survol ET au focus clavier (annoncée aux lecteurs d'écran)
export const ChartDetail: React.FC<ChartDetailProps> = ({
  text,
  placeholder = 'Survolez ou sélectionnez un élément pour voir le détail.',
}) => (
  <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-xs text-on-surface-variant">
    {text ?? placeholder}
  </p>
);
