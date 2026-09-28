import React, { useState, useEffect } from 'react';
import { departmentService, type Department } from '../../services/api';
import { Button } from '../../components/ui/Button';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departmentToEdit?: Department | null;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departmentToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (departmentToEdit) {
        setName(departmentToEdit.name || '');
        setDescription(departmentToEdit.description || '');
        setIsActive(departmentToEdit.isActive !== undefined ? departmentToEdit.isActive : (departmentToEdit.status !== 'INACTIF'));
      } else {
        setName('');
        setDescription('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, departmentToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const status = isActive ? 'ACTIF' : 'INACTIF';
      if (departmentToEdit) {
        await departmentService.update(departmentToEdit.id, { name, description, status, isActive });
      } else {
        await departmentService.create({ name, description, status, isActive });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur sauvegarde département:', err);
      const apiError = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors de la sauvegarde du département.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">{departmentToEdit ? 'edit' : 'lan'}</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {departmentToEdit ? 'Modifier le Département' : 'Nouveau Département'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {departmentToEdit ? 'Mettre à jour les informations du département' : 'Ajouter une nouvelle unité organisationnelle'}
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
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="deptName">
              Nom du Département *
            </label>
            <input
              id="deptName"
              type="text"
              placeholder="Ex: Infrastructure & Réseaux"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="deptDesc">
              Description (Optionnel)
            </label>
            <textarea
              id="deptDesc"
              rows={3}
              placeholder="Description des responsabilités du département..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="deptStatus">
              Statut du Département
            </label>
            <select
              id="deptStatus"
              value={isActive ? 'ACTIF' : 'INACTIF'}
              onChange={(e) => setIsActive(e.target.value === 'ACTIF')}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ACTIF">ACTIF</option>
              <option value="INACTIF">INACTIF</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : departmentToEdit ? 'Mettre à jour' : 'Créer le Département'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
