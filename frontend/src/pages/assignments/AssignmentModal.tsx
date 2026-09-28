import React, { useState, useEffect, useMemo } from 'react';
import {
  assignmentService,
  departmentService,
  equipmentService,
  positionService,
  userService,
  type AssigneeType,
  type Department,
  type Equipment,
  type Position,
  type User,
} from '../../services/api';
import { Button } from '../../components/ui/Button';
import { ASSIGNEE_TYPES, ASSIGNEE_TYPE_ICONS, ASSIGNEE_TYPE_LABELS } from '../../utils/assignee';
import { getApiErrorMessage } from '../../utils/apiError';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const isActive = (entity: { isActive?: boolean; status?: string }) =>
  entity.isActive !== undefined ? entity.isActive : entity.status !== 'INACTIF';

const ASSIGNEE_FIELD_LABELS: Record<AssigneeType, string> = {
  USER: 'Utilisateur bénéficiaire *',
  DEPARTMENT: 'Département bénéficiaire *',
  POSITION: 'Poste bénéficiaire *',
};

const ASSIGNEE_PLACEHOLDERS: Record<AssigneeType, string> = {
  USER: '-- Choisir un collaborateur --',
  DEPARTMENT: '-- Choisir un département --',
  POSITION: '-- Choisir un poste --',
};

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  // Bénéficiaires actifs, chargés à la demande au premier choix de leur type
  const [users, setUsers] = useState<User[] | null>(null);
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);

  const [equipmentId, setEquipmentId] = useState('');
  const [assigneeType, setAssigneeType] = useState<AssigneeType>('USER');
  const [assigneeId, setAssigneeId] = useState('');
  const [positionDepartmentId, setPositionDepartmentId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [handoverCondition, setHandoverCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');

  const [loadingData, setLoadingData] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  // Réinitialisation et chargement des équipements disponibles à l'ouverture
  useEffect(() => {
    if (!isOpen) return;

    setEquipmentId('');
    setAssigneeType('USER');
    setAssigneeId('');
    setPositionDepartmentId('');
    setExpectedReturnDate('');
    setHandoverCondition('GOOD');
    setNotes('');
    setError(null);
    setAssigneesError(null);
    setUsers(null);
    setDepartments(null);
    setPositions(null);

    const fetchEquipments = async () => {
      setLoadingData(true);
      try {
        const eqRes = await equipmentService.getAll();
        const allEquipments: Equipment[] = eqRes.data?.data || [];
        // Only keep AVAILABLE equipments
        setEquipments(allEquipments.filter((e) => e.status === 'AVAILABLE'));
      } catch (err) {
        console.error('Erreur chargement équipements:', err);
        setError('Impossible de charger les équipements disponibles.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchEquipments();
  }, [isOpen]);

  // Chargement des bénéficiaires du type choisi (une seule fois par type) ; les inactifs sont exclus
  const loadedForType = { USER: users, DEPARTMENT: departments, POSITION: positions }[assigneeType];
  useEffect(() => {
    if (!isOpen || loadedForType !== null) return;

    let cancelled = false;
    const fetchAssignees = async () => {
      setLoadingAssignees(true);
      setAssigneesError(null);
      try {
        if (assigneeType === 'USER') {
          const res = await userService.getAll();
          if (!cancelled) setUsers(((res.data?.data || []) as User[]).filter(isActive));
        } else if (assigneeType === 'DEPARTMENT') {
          const res = await departmentService.getAll();
          if (!cancelled) setDepartments(((res.data?.data || []) as Department[]).filter(isActive));
        } else {
          // Les départements servent aussi de préfiltre pour les postes
          const [posRes, depRes] = await Promise.all([
            positionService.getAll(),
            departmentService.getAll().catch(() => null),
          ]);
          if (!cancelled) {
            setPositions(((posRes.data?.data || []) as Position[]).filter(isActive));
            // Un échec du préfiltre ne doit pas figer une liste vide pour le type « Département »
            if (depRes) setDepartments(((depRes.data?.data || []) as Department[]).filter(isActive));
          }
        }
      } catch (err) {
        console.error(`Erreur chargement bénéficiaires (${assigneeType}):`, err);
        if (!cancelled) {
          setAssigneesError(`Impossible de charger la liste (${ASSIGNEE_TYPE_LABELS[assigneeType].toLowerCase()}).`);
        }
      } finally {
        if (!cancelled) setLoadingAssignees(false);
      }
    };

    fetchAssignees();
    return () => {
      cancelled = true;
    };
  }, [isOpen, assigneeType, loadedForType]);

  const visiblePositions = useMemo(
    () => (positions ?? []).filter((p) => !positionDepartmentId || p.departmentId === positionDepartmentId),
    [positions, positionDepartmentId]
  );

  if (!isOpen) return null;

  const handleTypeChange = (type: AssigneeType) => {
    if (type === assigneeType) return;
    setAssigneeType(type);
    // Le bénéficiaire choisi appartenait à l'ancien type : on l'efface
    setAssigneeId('');
    setPositionDepartmentId('');
    setAssigneesError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId || !assigneeId) {
      setError('Veuillez sélectionner un équipement et un bénéficiaire.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await assignmentService.create({
        equipmentId,
        assigneeType,
        assigneeId,
        expectedReturnDate: expectedReturnDate || undefined,
        handoverCondition,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur création affectation:', err);
      setError(getApiErrorMessage(err, "Erreur lors de la création de l'affectation."));
    } finally {
      setSubmitting(false);
    }
  };

  const assigneeListIsEmpty =
    !loadingAssignees &&
    !assigneesError &&
    loadedForType !== null &&
    (assigneeType === 'POSITION' ? visiblePositions.length === 0 : loadedForType.length === 0);

  const selectClass =
    'w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer';
  const labelClass = 'block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1';

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
                Attribuer un équipement disponible à un utilisateur, un département ou un poste
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

        {loadingData ? (
          <div className="py-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
            <p className="text-body-sm">Chargement des équipements...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sélection de l'équipement */}
            <div>
              <label className={labelClass} htmlFor="equipmentSelect">
                Équipement à affecter *
              </label>
              <select
                id="equipmentSelect"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className={selectClass}
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

            {/* Type de bénéficiaire */}
            <fieldset>
              <legend className={labelClass}>Type de bénéficiaire *</legend>
              <div role="radiogroup" aria-label="Type de bénéficiaire" className="grid grid-cols-3 gap-2">
                {ASSIGNEE_TYPES.map((type) => {
                  const selected = type === assigneeType;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleTypeChange(type)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 px-2 text-body-sm font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-primary/15 border-primary text-primary'
                          : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{ASSIGNEE_TYPE_ICONS[type]}</span>
                      <span>{ASSIGNEE_TYPE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Préfiltre par département (postes uniquement) */}
            {assigneeType === 'POSITION' && (
              <div>
                <label className={labelClass} htmlFor="positionDepartmentFilter">
                  Département du poste
                </label>
                <select
                  id="positionDepartmentFilter"
                  value={positionDepartmentId}
                  onChange={(e) => {
                    setPositionDepartmentId(e.target.value);
                    setAssigneeId('');
                  }}
                  className={selectClass}
                >
                  <option value="">Tous les départements</option>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sélection du bénéficiaire */}
            <div>
              <label className={labelClass} htmlFor="assigneeSelect">
                {ASSIGNEE_FIELD_LABELS[assigneeType]}
              </label>
              <select
                id="assigneeSelect"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={loadingAssignees || loadedForType === null}
                className={selectClass}
                required
              >
                <option value="">{loadingAssignees ? 'Chargement...' : ASSIGNEE_PLACEHOLDERS[assigneeType]}</option>
                {assigneeType === 'USER' &&
                  (users ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                {assigneeType === 'DEPARTMENT' &&
                  (departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                {assigneeType === 'POSITION' &&
                  visiblePositions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.department?.name ? `, ${p.department.name}` : ''}
                    </option>
                  ))}
              </select>
              {assigneesError && (
                <p role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  {assigneesError}
                </p>
              )}
              {assigneeListIsEmpty && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Aucun {ASSIGNEE_TYPE_LABELS[assigneeType].toLowerCase()} actif disponible.
                </p>
              )}
            </div>

            {/* Date de retour prévue et état à la remise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="returnDate">
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
                <label className={labelClass} htmlFor="handoverCond">
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
              <label className={labelClass} htmlFor="assignNotes">
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
                {submitting ? 'Affectation...' : "Créer l'affectation"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
