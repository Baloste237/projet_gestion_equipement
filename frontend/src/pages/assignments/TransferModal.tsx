import React, { useState, useEffect } from 'react';
import { assignmentService, userService, type Assignment, type User } from '../../services/api';
import { Button } from '../../components/ui/Button';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: Assignment | null;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && assignment) {
      setToUserId('');
      setReason('');
      setError(null);

      const fetchUsers = async () => {
        setLoadingData(true);
        try {
          const res = await userService.getAll();
          const allUsers: User[] = res.data?.data || [];
          // Filter out current user and inactive users
          setUsers(allUsers.filter((u) => u.id !== assignment.userId && u.isActive !== false && u.status !== 'INACTIF'));
        } catch (err) {
          console.error('Erreur chargement utilisateurs:', err);
          setError('Impossible de charger la liste des collaborateurs.');
        } finally {
          setLoadingData(false);
        }
      };

      fetchUsers();
    }
  }, [isOpen, assignment]);

  if (!isOpen || !assignment) return null;

  const equipmentName = assignment.equipment?.name || 'Équipement';
  const serialNumber = assignment.equipment?.serialNumber || assignment.equipmentId;
  const currentUserName = assignment.user ? `${assignment.user.firstName || ''} ${assignment.user.lastName || ''}`.trim() : assignment.userId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId) {
      setError('Veuillez sélectionner le nouveau bénéficiaire.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await assignmentService.transfer(assignment.id, {
        toUserId,
        reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur transfert équipement:', err);
      const apiMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors du transfert de l\'équipement.';
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined">swap_horiz</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Transférer l'Équipement
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Réaffecter directement ce matériel à un autre collaborateur
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

        {/* Current Info */}
        <div className="bg-surface-container border border-outline-variant rounded-lg p-3 mb-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Équipement:</span>
            <span className="font-semibold text-on-surface">{equipmentName} ({serialNumber})</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Détenteur actuel:</span>
            <span className="font-medium text-amber-400">{currentUserName}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        {loadingData ? (
          <div className="py-6 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
            <p className="text-body-sm">Chargement des collaborateurs...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nouveau bénéficiaire */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="toUserSelect">
                Nouveau bénéficiaire *
              </label>
              <select
                id="toUserSelect"
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                required
              >
                <option value="">-- Choisir le nouveau détenteur --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Motif du transfert */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="transferReason">
                Motif ou justification du transfert
              </label>
              <textarea
                id="transferReason"
                rows={3}
                placeholder="Ex: Changement de projet, remplacement temporaire..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || users.length === 0}>
                {submitting ? 'Transfert...' : 'Confirmer le transfert'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
