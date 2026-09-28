import React, { useState, useEffect } from 'react';
import { assignmentService, equipmentService, userService, type Equipment, type User } from '../../services/api';
import { Button } from '../../components/ui/Button';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [equipmentId, setEquipmentId] = useState('');
  const [userId, setUserId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [handoverCondition, setHandoverCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEquipmentId('');
      setUserId('');
      setExpectedReturnDate('');
      setHandoverCondition('GOOD');
      setNotes('');
      setError(null);

      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [eqRes, uRes] = await Promise.all([
            equipmentService.getAll(),
            userService.getAll(),
          ]);
          
          const allEquipments: Equipment[] = eqRes.data?.data || [];
          const allUsers: User[] = uRes.data?.data || [];

          // Only keep AVAILABLE equipments and active users
          setEquipments(allEquipments.filter((e) => e.status === 'AVAILABLE'));
          setUsers(allUsers.filter((u) => u.isActive !== false && u.status !== 'INACTIF'));
        } catch (err) {
          console.error('Erreur chargement données affectation:', err);
          setError('Impossible de charger les équipements ou utilisateurs disponibles.');
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !userId) {
      setError('Veuillez sélectionner un équipement et un utilisateur.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await assignmentService.create({
        equipmentId,
        userId,
        expectedReturnDate: expectedReturnDate || undefined,
        handoverCondition,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur création affectation:', err);
      const apiMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors de la création de l\'affectation.';
      setError(apiMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">magic_button</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Nouvelle Affectation
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Attribuer un équipement disponible à un collaborateur
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

        {loadingData ? (
          <div className="py-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
            <p className="text-body-sm">Chargement des équipements et utilisateurs...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sélection de l'équipement */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="equipmentSelect">
                Équipement à affecter *
              </label>
              <select
                id="equipmentSelect"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                required
              >
                <option value="">-- Choisir un équipement disponible --</option>
                {equipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.serialNumber})
                  </option>
                ))}
              </select>
              {equipments.length === 0 && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Aucun équipement disponible (statut DISPONIBLE) actuellement.
                </p>
              )}
            </div>

            {/* Sélection du destinataire */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="userSelect">
                Bénéficiaire / Utilisateur *
              </label>
              <select
                id="userSelect"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                required
              >
                <option value="">-- Choisir un collaborateur --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Date de retour prévue et état à la remise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="returnDate">
                  Date de retour prévue
                </label>
                <input
                  id="returnDate"
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="handoverCond">
                  État au moment de la remise
                </label>
                <select
                  id="handoverCond"
                  value={handoverCondition}
                  onChange={(e) => setHandoverCondition(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="GOOD">Excellent / Bon état</option>
                  <option value="NEW">Neuf (sous scellé)</option>
                  <option value="FAIR">État d'usage correct</option>
                </select>
              </div>
            </div>

            {/* Notes complémentaires */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="assignNotes">
                Notes et consignes
              </label>
              <textarea
                id="assignNotes"
                rows={3}
                placeholder="Précisez les accessoires fournis (sacoche, chargeur, adaptateur...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || equipments.length === 0}>
                {submitting ? 'Affectation...' : 'Créer l\'affectation'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
