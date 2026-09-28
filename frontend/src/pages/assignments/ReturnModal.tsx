import React, { useState, useEffect } from 'react';
import { assignmentService, type Assignment } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { describeAssignee } from '../../utils/assignee';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: Assignment | null;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
}) => {
  const [condition, setCondition] = useState<'GOOD' | 'DAMAGED' | 'LOST'>('GOOD');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCondition('GOOD');
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !assignment) return null;

  const equipmentName = assignment.equipment?.name || 'Équipement';
  const serialNumber = assignment.equipment?.serialNumber || assignment.equipmentId;
  const holder = describeAssignee(assignment);
  const userName = `${holder.name} (${holder.typeLabel})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await assignmentService.return(assignment.id, {
        condition,
        note: note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur restitution équipement:', err);
      const apiMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors de l\'enregistrement de la restitution.';
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
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined">assignment_turned_in</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Enregistrer une Restitution
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Confirmer le retour de l'équipement dans le stock
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

        {/* Assignment info preview */}
        <div className="bg-surface-container border border-outline-variant rounded-lg p-3 mb-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Équipement:</span>
            <span className="font-semibold text-on-surface">{equipmentName} ({serialNumber})</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Détenteur actuel:</span>
            <span className="font-medium text-primary">{userName}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* État de restitution */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="returnCondition">
              État de l'équipement au retour *
            </label>
            <select
              id="returnCondition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="GOOD">Bon état (Remettre en stock DISPONIBLE)</option>
              <option value="DAMAGED">Endommagé (Envoyer en MAINTENANCE)</option>
              <option value="LOST">Perdu / Non restitué (Passer en MAINTENANCE)</option>
            </select>
          </div>

          {/* Observations */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="returnNote">
              Remarques et détails du retour
            </label>
            <textarea
              id="returnNote"
              rows={3}
              placeholder="Ex: Restitué avec sacoche et câbles. Légère rayure sur le capot..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Traitement...' : 'Confirmer la restitution'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
