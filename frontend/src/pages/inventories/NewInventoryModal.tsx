import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/api';
import { Button } from '../../components/ui/Button';

interface NewInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewInventoryModal: React.FC<NewInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [autoPopulate, setAutoPopulate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultTitle = `Campagne d'Inventaire - ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      setTitle(defaultTitle);
      setAutoPopulate(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Veuillez saisir un titre pour la campagne d\'inventaire.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await inventoryService.create({
        title: title.trim(),
        autoPopulate,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur création inventaire:', err);
      const apiMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors de la création de la campagne d\'inventaire.';
      setError(apiMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Nouvel Inventaire
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Lancer une campagne de récolement du parc matériel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="invTitle">
              Titre de la Campagne *
            </label>
            <input
              id="invTitle"
              type="text"
              placeholder="Ex: Récolement Annuel - Siège & Filiales"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="bg-surface-container border border-outline-variant/70 rounded-lg p-3 flex items-start gap-3">
            <input
              id="autoPopulate"
              type="checkbox"
              checked={autoPopulate}
              onChange={(e) => setAutoPopulate(e.target.checked)}
              className="mt-1 accent-primary rounded cursor-pointer w-4 h-4"
            />
            <label htmlFor="autoPopulate" className="text-body-sm text-on-surface cursor-pointer select-none">
              <span className="font-semibold block text-on-surface">Import automatique du parc</span>
              <span className="text-xs text-on-surface-variant">
                Inclure immédiatement tous les équipements actifs du parc dans cette liste d'inspection.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Création...' : 'Lancer la Campagne'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
