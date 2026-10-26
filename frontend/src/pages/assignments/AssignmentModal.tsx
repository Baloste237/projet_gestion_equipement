import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  assignmentService,
  departmentService,
  equipmentService,
  positionService,
  userService,
  type AssigneeType,
  type BulkRefusal,
  type Department,
  type Equipment,
  type Position,
  type User,
} from '../../services/api';
import { Button } from '../../components/ui/Button';
import { ASSIGNEE_TYPES, ASSIGNEE_TYPE_ICONS, ASSIGNEE_TYPE_LABELS } from '../../utils/assignee';
import { getApiErrorDetails, getApiErrorMessage } from '../../utils/apiError';
import {
  MAX_BULK_ASSIGNMENTS,
  describeRefusal,
  exceedsLimit,
  filterByQuery,
  parseBulkRefusals,
  successMessage,
} from '../../utils/equipmentSelection';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé dès qu'une affectation est créée, pour rafraîchir les listes de la page appelante */
  onSuccess: () => void;
  /** Équipements retenus à l'ouverture (ex. sélection dans la liste des équipements) */
  preselectedEquipmentIds?: string[];
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
  preselectedEquipmentIds,
}) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  // Lue seulement à l'ouverture : le tableau reçu change à chaque rendu du parent
  const preselectedRef = useRef(preselectedEquipmentIds);
  preselectedRef.current = preselectedEquipmentIds;
  // Bénéficiaires actifs, chargés à la demande au premier choix de leur type
  const [users, setUsers] = useState<User[] | null>(null);
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);

  // Équipements retenus (dans l'ordre de choix) et recherche dans la liste des disponibles
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [equipmentQuery, setEquipmentQuery] = useState('');
  // Résultat : succès (nombre affecté) ou refus détaillé de l'affectation groupée
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [refusals, setRefusals] = useState<BulkRefusal[] | null>(null);
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

  // Charge les équipements disponibles ; les équipements retenus devenus indisponibles sont retirés
  const loadEquipments = useCallback(async () => {
    setLoadingData(true);
    try {
      const eqRes = await equipmentService.getAll();
      const allEquipments: Equipment[] = eqRes.data?.data || [];
      const available = allEquipments.filter((e) => e.status === 'AVAILABLE');
      setEquipments(available);
      const availableIds = new Set(available.map((e) => e.id));
      setSelectedEquipmentIds((previous) => previous.filter((id) => availableIds.has(id)));
    } catch (err) {
      console.error('Erreur chargement équipements:', err);
      setError('Impossible de charger les équipements disponibles.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Réinitialisation et chargement des équipements disponibles à l'ouverture
  useEffect(() => {
    if (!isOpen) return;

    setSelectedEquipmentIds(preselectedRef.current ?? []);
    setEquipmentQuery('');
    setSuccessCount(null);
    setRefusals(null);
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

    loadEquipments();
  }, [isOpen, loadEquipments]);

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

  const equipmentById = useMemo(() => new Map(equipments.map((e) => [e.id, e])), [equipments]);
  const visibleEquipments = useMemo(() => filterByQuery(equipments, equipmentQuery), [equipments, equipmentQuery]);

  if (!isOpen) return null;

  const toggleEquipment = (id: string) =>
    setSelectedEquipmentIds((previous) => (previous.includes(id) ? previous.filter((x) => x !== id) : [...previous, id]));
  const selectVisibleEquipments = () =>
    setSelectedEquipmentIds((previous) => [...previous, ...visibleEquipments.map((e) => e.id).filter((id) => !previous.includes(id))]);
  const clearEquipments = () => setSelectedEquipmentIds([]);
  const removeRefusedEquipments = () => {
    const refused = new Set((refusals ?? []).map((r) => r.equipmentId));
    setSelectedEquipmentIds((previous) => previous.filter((id) => !refused.has(id)));
    setRefusals(null);
  };

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
    if (selectedEquipmentIds.length === 0 || !assigneeId) {
      setError('Veuillez sélectionner au moins un équipement et un bénéficiaire.');
      return;
    }
    if (exceedsLimit(selectedEquipmentIds.length)) {
      setError(`Maximum ${MAX_BULK_ASSIGNMENTS} équipements par affectation.`);
      return;
    }

    setError(null);
    setRefusals(null);
    setSubmitting(true);

    const common = {
      assigneeType,
      assigneeId,
      expectedReturnDate: expectedReturnDate || undefined,
      handoverCondition,
      notes: notes.trim() || undefined,
    };

    try {
      // Un seul équipement : appel unitaire, comme avant ; sinon appel groupé (tout ou rien)
      if (selectedEquipmentIds.length === 1) {
        await assignmentService.create({ equipmentId: selectedEquipmentIds[0], ...common });
      } else {
        await assignmentService.createBulk({ equipmentIds: selectedEquipmentIds, ...common });
      }
      setSuccessCount(selectedEquipmentIds.length);
      onSuccess();
    } catch (err) {
      console.error('Erreur création affectation:', err);
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const refused = parseBulkRefusals(getApiErrorDetails(err));
      if (code === 'BULK_ASSIGNMENT_REFUSED' && refused.length > 0) {
        setRefusals(refused);
      } else {
        setError(getApiErrorMessage(err, "Erreur lors de la création de l'affectation."));
      }
      // Un refus signifie que la liste des disponibles a changé : on la recharge
      if (code === 'BULK_ASSIGNMENT_REFUSED' || code === 'EQUIPMENT_ALREADY_ASSIGNED') loadEquipments();
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
                Attribuer un ou plusieurs équipements disponibles à un utilisateur, un département ou un poste
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

        {successCount !== null ? (
          <div role="status" className="py-6 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
            <p className="font-headline-sm text-headline-sm font-semibold text-on-surface">{successMessage(successCount)}</p>
            <p className="text-body-sm text-on-surface-variant">Les listes ont été mises à jour.</p>
            <Button type="button" onClick={onClose}>
              Terminer
            </Button>
          </div>
        ) : loadingData ? (
          <div className="py-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
            <p className="text-body-sm">Chargement des équipements...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Refus de l'affectation groupée : rien n'a été créé */}
            {refusals && (
              <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-body-sm space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  Aucune affectation n'a été créée : {refusals.length} équipement{refusals.length > 1 ? 's' : ''} refusé
                  {refusals.length > 1 ? 's' : ''}.
                </p>
                <ul className="list-disc pl-5 space-y-0.5 max-h-32 overflow-y-auto">
                  {refusals.map((refusal) => (
                    <li key={refusal.equipmentId}>{describeRefusal(refusal)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={removeRefusedEquipments}
                  className="text-xs underline hover:no-underline font-medium cursor-pointer"
                >
                  Retirer ces équipements de la sélection
                </button>
              </div>
            )}

            {/* Sélection des équipements (un ou plusieurs) */}
            <fieldset>
              <legend className={labelClass}>
                Équipements à affecter * ({selectedEquipmentIds.length} retenu{selectedEquipmentIds.length > 1 ? 's' : ''})
              </legend>
              <input
                id="equipmentSearch"
                type="search"
                value={equipmentQuery}
                onChange={(e) => setEquipmentQuery(e.target.value)}
                placeholder="Rechercher par nom ou numéro de série..."
                aria-label="Rechercher un équipement disponible"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary mb-2"
              />
              <div className="flex items-center gap-3 mb-2 text-xs">
                <button
                  type="button"
                  onClick={selectVisibleEquipments}
                  disabled={visibleEquipments.length === 0}
                  className="text-primary underline hover:no-underline disabled:opacity-40 cursor-pointer"
                >
                  Tout sélectionner ({visibleEquipments.length})
                </button>
                <button
                  type="button"
                  onClick={clearEquipments}
                  disabled={selectedEquipmentIds.length === 0}
                  className="text-on-surface-variant underline hover:no-underline disabled:opacity-40 cursor-pointer"
                >
                  Tout retirer
                </button>
              </div>
              <ul
                aria-label="Équipements disponibles"
                className="max-h-44 overflow-y-auto border border-outline-variant rounded-lg divide-y divide-outline-variant/30 bg-surface-container-lowest"
              >
                {visibleEquipments.map((eq) => (
                  <li key={eq.id}>
                    <label className="flex items-center gap-3 px-3 py-2 text-body-sm text-on-surface cursor-pointer hover:bg-surface-container">
                      <input
                        type="checkbox"
                        checked={selectedEquipmentIds.includes(eq.id)}
                        onChange={() => toggleEquipment(eq.id)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="flex-1 truncate">{eq.name}</span>
                      <span className="font-mono text-xs text-on-surface-variant">{eq.serialNumber}</span>
                    </label>
                  </li>
                ))}
                {visibleEquipments.length === 0 && (
                  <li className="px-3 py-3 text-xs text-on-surface-variant">
                    {equipments.length === 0 ? 'Aucun équipement disponible actuellement.' : 'Aucun équipement ne correspond à la recherche.'}
                  </li>
                )}
              </ul>

              {selectedEquipmentIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto" aria-label="Équipements retenus">
                  {selectedEquipmentIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 bg-primary/10 border border-primary/30 text-primary rounded-full pl-2.5 pr-1 py-0.5 text-xs"
                    >
                      {equipmentById.get(id)?.name ?? id.slice(0, 8)}
                      <button
                        type="button"
                        onClick={() => toggleEquipment(id)}
                        aria-label={`Retirer ${equipmentById.get(id)?.name ?? id}`}
                        className="rounded-full hover:bg-primary/20 p-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {exceedsLimit(selectedEquipmentIds.length) && (
                <p role="alert" className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Maximum {MAX_BULK_ASSIGNMENTS} équipements par affectation : retirez-en pour continuer.
                </p>
              )}
            </fieldset>

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
              <Button
                type="submit"
                disabled={submitting || selectedEquipmentIds.length === 0 || exceedsLimit(selectedEquipmentIds.length)}
              >
                {submitting
                  ? 'Affectation...'
                  : selectedEquipmentIds.length > 1
                  ? `Affecter ${selectedEquipmentIds.length} équipements`
                  : "Créer l'affectation"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
