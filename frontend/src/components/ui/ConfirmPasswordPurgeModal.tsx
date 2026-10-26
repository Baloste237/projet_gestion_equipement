import React, { useState, useEffect } from 'react';

export interface ConfirmPasswordPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  error?: string | null;
}

export const ConfirmPasswordPurgeModal: React.FC<ConfirmPasswordPurgeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Vider la liste',
  cancelText = 'Annuler',
  loading = false,
  error = null,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    onConfirm(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 bg-red-500/10 border-red-500/30 text-red-400">
            <span className="material-symbols-outlined text-2xl">delete_sweep</span>
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-body-sm font-medium text-on-surface mb-1.5">
              Mot de passe administrateur requis
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                autoFocus
                disabled={loading}
                className="w-full px-3 py-2 pr-10 rounded-xl text-body-sm border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-body-sm font-medium border border-outline-variant bg-surface-container hover:bg-surface-variant text-on-surface transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="px-4 py-2 rounded-xl text-body-sm font-medium transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading && <span className="material-symbols-outlined animate-spin text-base">sync</span>}
              <span>{confirmText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
