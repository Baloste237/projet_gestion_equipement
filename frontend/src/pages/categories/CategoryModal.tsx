import React, { useState, useEffect } from 'react';
import { categoryService, type Category } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { categoryErrorMessage } from '../../utils/categoryErrors';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryToEdit?: Category | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSuccess, categoryToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(categoryToEdit?.name ?? '');
      setDescription(categoryToEdit?.description ?? '');
      setError(null);
    }
  }, [isOpen, categoryToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = { name: name.trim(), description: description.trim() };
      if (categoryToEdit) {
        await categoryService.update(categoryToEdit.id, data);
      } else {
        await categoryService.create(data);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde catégorie:', err);
      setError(categoryErrorMessage(err, 'Erreur lors de la sauvegarde de la catégorie.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">{categoryToEdit ? 'edit' : 'category'}</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {categoryToEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {categoryToEdit ? 'Mettre à jour le nom ou la description' : 'Ajouter une catégorie d’équipements'}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="categoryName">
              Nom de la catégorie *
            </label>
            <input
              id="categoryName"
              type="text"
              placeholder="Ex: Ordinateurs portables"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="categoryDescription">
              Description (Optionnel)
            </label>
            <textarea
              id="categoryDescription"
              rows={3}
              maxLength={500}
              placeholder="Type de matériel regroupé dans cette catégorie..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : categoryToEdit ? 'Mettre à jour' : 'Créer la catégorie'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
