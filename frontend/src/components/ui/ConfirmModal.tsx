import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  const iconConfig = {
    danger: { icon: 'warning', bg: 'bg-red-500/10 border-red-500/30 text-red-400', btn: 'bg-red-600 hover:bg-red-700 text-white' },
    warning: { icon: 'report_problem', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
    primary: { icon: 'help_outline', bg: 'bg-primary/10 border-primary/30 text-primary', btn: 'bg-primary hover:bg-primary/90 text-on-primary-container font-bold' },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${iconConfig.bg}`}>
            <span className="material-symbols-outlined text-2xl">{iconConfig.icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              {title}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-body-sm font-medium border border-outline-variant bg-surface-container hover:bg-surface-variant text-on-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-body-sm font-medium transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${iconConfig.btn}`}
          >
            {loading && <span className="material-symbols-outlined animate-spin text-base">sync</span>}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
