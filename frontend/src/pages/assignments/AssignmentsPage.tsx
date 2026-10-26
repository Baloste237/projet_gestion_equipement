import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { useClientPagination } from '../../hooks/useClientPagination';
import { AppLayout } from '../../components/layout/AppLayout';
import { assignmentService, type Assignment, type AssigneeType } from '../../services/api';
import { AssignmentModal } from './AssignmentModal';
import { ReturnModal } from './ReturnModal';
import { TransferModal } from './TransferModal';
import { Button } from '../../components/ui/Button';
import {
  ASSIGNEE_TYPES,
  ASSIGNEE_TYPE_LABELS,
  TRANSFER_UNAVAILABLE_HINT,
  assigneeSearchText,
  canTransfer,
  describeAssignee,
} from '../../utils/assignee';

export const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AssigneeType>('ALL');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedForReturn, setSelectedForReturn] = useState<Assignment | null>(null);
  const [selectedForTransfer, setSelectedForTransfer] = useState<Assignment | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentService.getAll();
      setAssignments(res.data?.data || []);
    } catch (err: any) {
      console.error('Erreur chargement affectations:', err);
      setError('Impossible de charger la liste des affectations depuis le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Stats computation
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let totalActive = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;

    assignments.forEach((asgn) => {
      if (asgn.status === 'ACTIVE') {
        totalActive++;
        if (asgn.expectedReturnDate) {
          const retDate = asgn.expectedReturnDate.split('T')[0];
          if (retDate < today) {
            overdueCount++;
          } else if (retDate === today) {
            dueTodayCount++;
          }
        }
      }
    });

    return { totalActive, overdueCount, dueTodayCount };
  }, [assignments]);

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((asgn) => {
      const assigneeText = assigneeSearchText(asgn);
      const eqName = asgn.equipment?.name?.toLowerCase() || '';
      const eqSerial = asgn.equipment?.serialNumber?.toLowerCase() || '';

      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        assigneeText.includes(query) ||
        eqName.includes(query) ||
        eqSerial.includes(query);

      const matchesStatus =
        statusFilter === 'ALL' || asgn.status === statusFilter;

      const matchesType = typeFilter === 'ALL' || (asgn.assigneeType ?? 'USER') === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [assignments, searchTerm, statusFilter, typeFilter]);

  // Pagination dans le navigateur ; les statistiques restent calculées sur toutes les affectations
  const paging = useClientPagination(filteredAssignments, [searchTerm, statusFilter, typeFilter].join('|'));

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    const retDate = dateStr.split('T')[0];
    return retDate < today;
  };

  return (
    <AppLayout
      title="Affectations des Ressources"
      subtitle="Suivez et gérez les équipements actuellement déployés auprès du personnel."
    >
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              Affectations Actives
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Attribution des équipements à des utilisateurs, départements ou postes, suivi des retours et transferts entre utilisateurs.
            </p>
          </div>

          <Button
            onClick={() => setIsAssignModalOpen(true)}
            icon={<span className="material-symbols-outlined text-xl">magic_button</span>}
          >
            Nouvelle Affectation
          </Button>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant flex items-center justify-between shadow-sm">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Total Actives
              </p>
              <p className="font-headline-lg text-headline-lg text-on-surface font-bold">
                {stats.totalActive}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-2xl">inventory</span>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant flex items-center justify-between shadow-sm border-l-4 border-l-red-500">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                Retards de Restitution
              </p>
              <p className="font-headline-lg text-headline-lg text-red-400 font-bold">
                {stats.overdueCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-5 border border-outline-variant flex items-center justify-between shadow-sm">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                À Retourner Aujourd'hui
              </p>
              <p className="font-headline-lg text-headline-lg text-primary font-bold">
                {stats.dueTodayCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Rechercher bénéficiaire ou équipement..."
                aria-label="Rechercher un bénéficiaire ou un équipement"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-9 pr-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="ACTIVE">ACTIVES</option>
              <option value="TRANSFERRED">TRANSFÉRÉES</option>
              <option value="RETURNED">RESTITUÉES</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | AssigneeType)}
              aria-label="Filtrer par type de bénéficiaire"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tous les bénéficiaires</option>
              {ASSIGNEE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSIGNEE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Affichage de {filteredAssignments.length} sur {assignments.length} affectations
          </span>
        </div>

        {/* Table Section */}
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p>Chargement des affectations...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl">error</span>
            <p>{error}</p>
            <Button variant="outline" className="mt-2" onClick={fetchAssignments}>
              Réessayer
            </Button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined text-4xl opacity-50">assignment_late</span>
            <p className="font-headline-sm text-headline-sm text-on-surface">Aucune affectation trouvée</p>
            <p className="text-body-sm">Créez votre première affectation d'équipement pour débuter le suivi.</p>
          </div>
        ) : (
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest font-label-md text-label-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-xs">
                    <th className="py-3 px-4 font-medium">Bénéficiaire</th>
                    <th className="py-3 px-4 font-medium">N° Série & Équipement</th>
                    <th className="py-3 px-4 font-medium">Date d'affectation</th>
                    <th className="py-3 px-4 font-medium">Retour prévu</th>
                    <th className="py-3 px-4 font-medium">État remise / Statut</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-body-sm text-on-surface">
                  {paging.pageItems.map((asgn) => {
                    const assignee = describeAssignee(asgn);
                    const eqName = asgn.equipment?.name || 'Équipement';
                    const eqSerial = asgn.equipment?.serialNumber || asgn.equipmentId.substring(0, 8);
                    const overdue = asgn.status === 'ACTIVE' && isOverdue(asgn.expectedReturnDate);

                    return (
                      <tr key={asgn.id} className="hover:bg-surface-container-high/50 transition-colors">
                        {/* User Cell */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${
                                assignee.available
                                  ? 'bg-primary/20 border-primary/40 text-primary'
                                  : 'bg-surface-container-high border-outline-variant text-outline'
                              }`}
                            >
                              {assignee.avatarUrl ? (
                                <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                              ) : assignee.type === 'USER' && assignee.available ? (
                                assignee.name.charAt(0).toUpperCase()
                              ) : (
                                <span className="material-symbols-outlined text-lg">{assignee.icon}</span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`font-semibold truncate ${assignee.available ? 'text-on-surface' : 'text-outline italic'}`}>
                                {assignee.name}
                              </span>
                              <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
                                <span className="px-1.5 py-px rounded border border-outline-variant/60 bg-surface-container-high text-[10px] uppercase tracking-wide">
                                  {assignee.typeLabel}
                                </span>
                                {assignee.type !== 'DEPARTMENT' && <span className="truncate">{assignee.subtitle}</span>}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Equipment Cell */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-primary font-mono text-xs">{eqSerial}</span>
                            <span className="text-on-surface-variant font-medium">{eqName}</span>
                          </div>
                        </td>

                        {/* Assigned Date */}
                        <td className="py-3 px-4 text-on-surface-variant">
                          {formatDate(asgn.assignedAt)}
                        </td>

                        {/* Expected Return Date */}
                        <td className="py-3 px-4">
                          {asgn.status === 'ACTIVE' ? (
                            overdue ? (
                              <div className="inline-flex items-center gap-1 text-red-400 font-medium bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full text-xs">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                {formatDate(asgn.expectedReturnDate)} (En retard)
                              </div>
                            ) : (
                              <span className="text-on-surface-variant font-medium">
                                {formatDate(asgn.expectedReturnDate)}
                              </span>
                            )
                          ) : (
                            <span className="text-outline text-xs">Restitué / Transféré</span>
                          )}
                        </td>

                        {/* Handover Condition & Status */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {asgn.status === 'ACTIVE' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs font-semibold">
                                ● ACTIF
                              </span>
                            )}
                            {asgn.status === 'TRANSFERRED' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs font-semibold">
                                ↔ TRANSFÉRÉ
                              </span>
                            )}
                            {asgn.status === 'RETURNED' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-outline-variant text-outline bg-surface-container-high text-xs font-semibold">
                                ✓ RESTITUÉ
                              </span>
                            )}

                            {asgn.handoverCondition && (
                              <span className="text-[11px] text-on-surface-variant bg-surface-container-high border border-outline-variant/60 px-1.5 py-0.5 rounded">
                                {asgn.handoverCondition}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {asgn.status === 'ACTIVE' ? (
                            <div className="flex items-center justify-end gap-2">
                              {canTransfer(asgn) ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedForTransfer(asgn)}
                                  className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-body-sm font-medium hover:bg-surface-variant text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Transférer à un autre collaborateur"
                                >
                                  <span className="material-symbols-outlined text-base">swap_horiz</span>
                                  <span className="hidden sm:inline">Transférer</span>
                                </button>
                              ) : (
                                <span
                                  className="px-1 text-outline cursor-help"
                                  title={TRANSFER_UNAVAILABLE_HINT}
                                  aria-label={TRANSFER_UNAVAILABLE_HINT}
                                  role="img"
                                >
                                  <span className="material-symbols-outlined text-base align-middle">info</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedForReturn(asgn)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-body-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Enregistrer la restitution du matériel"
                              >
                                <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                                <span>Restituer</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-outline font-mono">Clôturé</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={paging.page}
              pageSize={paging.pageSize}
              total={paging.total}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <AssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={fetchAssignments}
      />

      <ReturnModal
        isOpen={!!selectedForReturn}
        onClose={() => setSelectedForReturn(null)}
        onSuccess={fetchAssignments}
        assignment={selectedForReturn}
      />

      <TransferModal
        isOpen={!!selectedForTransfer}
        onClose={() => setSelectedForTransfer(null)}
        onSuccess={fetchAssignments}
        assignment={selectedForTransfer}
      />
    </AppLayout>
  );
};
