import React, { useState, useEffect } from 'react';
import { departmentService, positionService, type Department, type Position } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { getApiErrorMessage } from '../../utils/apiError';

interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  positionToEdit?: Position | null;
  /** Département présélectionné (filtre actif de la page) pour une création */
  defaultDepartmentId?: string;
}

const isDepartmentActive = (d: Department) => (d.isActive !== undefined ? d.isActive : d.status !== 'INACTIF');

export const PositionModal: React.FC<PositionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  positionToEdit,
  defaultDepartmentId,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (positionToEdit) {
      setName(positionToEdit.name || '');
      setDescription(positionToEdit.description || '');
      setDepartmentId(positionToEdit.departmentId || '');
      setIsActive(positionToEdit.isActive !== undefined ? positionToEdit.isActive : positionToEdit.status !== 'INACTIF');
    } else {
      setName('');
      setDescription('');
      setDepartmentId(defaultDepartmentId || '');
      setIsActive(true);
    }
    setError(null);

    const loadDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await departmentService.getAll();
        setDepartments(res.data?.data || []);
      } catch (err) {
        console.error('Erreur chargement départements:', err);
        setError('Impossible de charger la liste des départements.');
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepartments();
  }, [isOpen, positionToEdit, defaultDepartmentId]);

  if (!isOpen) return null;

  // Un département inactif n'est proposé que s'il est déjà celui du poste édité
  const selectableDepartments = departments.filter(
    (d) => isDepartmentActive(d) || d.id === positionToEdit?.departmentId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) {
      setError('Veuillez sélectionner un département.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        departmentId,
        description: description.trim() || null,
        status: isActive ? ('ACTIF' as const) : ('INACTIF' as const),
        isActive,
      };
      if (positionToEdit) {
        await positionService.update(positionToEdit.id, payload);
      } else {
        await positionService.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde poste:', err);
      setError(getApiErrorMessage(err, 'Erreur lors de la sauvegarde du poste.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">{positionToEdit ? 'edit' : 'badge'}</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {positionToEdit ? 'Modifier le Poste' : 'Nouveau Poste'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {positionToEdit ? 'Mettre à jour les informations du poste' : 'Ajouter un poste de travail à un département'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="positionName">
              Nom du Poste *
            </label>
            <input
              id="positionName"
              type="text"
              placeholder="Ex: Technicien réseau"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="positionDepartment">
              Département *
            </label>
            <select
              id="positionDepartment"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={loadingDepartments}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              required
            >
              <option value="">{loadingDepartments ? 'Chargement...' : 'Sélectionner un département'}</option>
              {selectableDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {isDepartmentActive(d) ? '' : ' (inactif)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="positionDesc">
              Description (Optionnel)
            </label>
            <textarea
              id="positionDesc"
              rows={3}
              placeholder="Rôle et responsabilités du poste..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="positionStatus">
              Statut du Poste
            </label>
            <select
              id="positionStatus"
              value={isActive ? 'ACTIF' : 'INACTIF'}
              onChange={(e) => setIsActive(e.target.value === 'ACTIF')}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ACTIF">ACTIF</option>
              <option value="INACTIF">INACTIF</option>
            </select>
            {!isActive && (
              <p className="text-xs text-on-surface-variant mt-1">
                Un poste inactif n'est plus proposé pour de nouvelles affectations.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || loadingDepartments}>
              {loading ? 'Enregistrement...' : positionToEdit ? 'Mettre à jour' : 'Créer le Poste'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
