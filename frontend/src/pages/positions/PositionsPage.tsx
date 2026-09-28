import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { departmentService, positionService, type Department, type Position } from '../../services/api';
import { PositionModal } from './PositionModal';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { getApiErrorMessage } from '../../utils/apiError';

type ConfirmAction = 'status' | 'delete';

const isPositionActive = (p: Position) => (p.isActive !== undefined ? p.isActive : p.status !== 'INACTIF');

export const PositionsPage: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIF' | 'INACTIF'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    position: Position | null;
    action: ConfirmAction;
  }>({ isOpen: false, position: null, action: 'status' });
  const [confirming, setConfirming] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [positionsRes, departmentsRes] = await Promise.all([
        positionService.getAll(),
        departmentService.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setPositions(positionsRes.data?.data || []);
      setDepartments(departmentsRes.data?.data || []);
    } catch (err) {
      console.error('Erreur chargement postes:', err);
      setError('Impossible de charger la liste des postes depuis le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const closeConfirm = () => setConfirmState({ isOpen: false, position: null, action: 'status' });

  const handleConfirm = async () => {
    const { position, action } = confirmState;
    if (!position) return;

    setConfirming(true);
    setActionError(null);
    try {
      if (action === 'status') {
        const nextActive = !isPositionActive(position);
        await positionService.update(position.id, {
          status: nextActive ? 'ACTIF' : 'INACTIF',
          isActive: nextActive,
        });
      } else {
        await positionService.delete(position.id);
      }
      await fetchData();
    } catch (err) {
      console.error(`Erreur ${action} poste:`, err);
      setActionError(
        getApiErrorMessage(
          err,
          action === 'delete' ? 'La suppression du poste a échoué.' : 'Le changement de statut a échoué.'
        )
      );
    } finally {
      setConfirming(false);
      closeConfirm();
    }
  };

  const filteredPositions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return positions.filter((p) => {
      const matchesSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.department?.name?.toLowerCase().includes(term);
      const matchesDepartment = !departmentFilter || p.departmentId === departmentFilter;
      const active = isPositionActive(p);
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIF' && active) || (statusFilter === 'INACTIF' && !active);
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [positions, searchTerm, departmentFilter, statusFilter]);

  const confirmPosition = confirmState.position;
  const confirmDeactivates = confirmPosition ? isPositionActive(confirmPosition) : false;

  return (
    <AppLayout
      title="Gestion des Postes"
      subtitle="Définissez les postes de travail de chaque département pour leur affecter du matériel."
    >
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col md:flex-row items-center justify-between gap-md mb-lg">
        <div className="flex flex-wrap items-center gap-md w-full md:w-auto">
          <div className="relative flex-1 md:w-72 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher un poste..."
              aria-label="Rechercher un poste"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-9 pr-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filtrer par département"
            className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Tous les départements</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIF' | 'INACTIF')}
            aria-label="Filtrer par statut"
            className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Tous les Statuts</option>
            <option value="ACTIF">ACTIF</option>
            <option value="INACTIF">INACTIF</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setEditingPosition(null);
            setIsModalOpen(true);
          }}
          icon={<span className="material-symbols-outlined text-xl">add</span>}
        >
          Nouveau Poste
        </Button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-md bg-error/10 border border-error/30 text-error p-4 rounded-xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Fermer le message"
            className="text-xs underline hover:no-underline font-medium cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
          <p>Chargement des postes...</p>
        </div>
      ) : error ? (
        <div className="p-lg text-center text-error bg-error/10 border border-error/30 rounded-xl flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-3xl">error</span>
          <p>{error}</p>
          <Button variant="outline" className="mt-2" onClick={fetchData}>
            Réessayer
          </Button>
        </div>
      ) : filteredPositions.length === 0 ? (
        <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-4xl opacity-50">badge</span>
          <p className="font-headline-sm text-headline-sm text-on-surface">Aucun poste trouvé</p>
          <p className="text-body-sm">
            {positions.length === 0
              ? 'Créez votre premier poste pour pouvoir lui affecter des équipements.'
              : 'Essayez de modifier vos filtres.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-xs">
                  <th className="py-3 px-4 font-medium">Poste</th>
                  <th className="py-3 px-4 font-medium">Département</th>
                  <th className="py-3 px-4 font-medium">Description</th>
                  <th className="py-3 px-4 font-medium">Statut</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body-sm text-on-surface">
                {filteredPositions.map((position) => {
                  const active = isPositionActive(position);
                  return (
                    <tr key={position.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">badge</span>
                          </div>
                          <span className="font-semibold">{position.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{position.department?.name || '—'}</td>
                      <td className="py-3 px-4 text-on-surface-variant max-w-xs truncate" title={position.description || undefined}>
                        {position.description || 'Aucune description'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setConfirmState({ isOpen: true, position, action: 'status' })}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                            active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                          }`}
                          title="Cliquer pour basculer le statut Actif / Inactif"
                        >
                          <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          <span>{active ? 'ACTIF' : 'INACTIF'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPosition(position);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                            title="Modifier"
                            aria-label={`Modifier le poste ${position.name}`}
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmState({ isOpen: true, position, action: 'delete' })}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                            title="Supprimer"
                            aria-label={`Supprimer le poste ${position.name}`}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        positionToEdit={editingPosition}
        defaultDepartmentId={departmentFilter || undefined}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirming}
        title={confirmState.action === 'status' ? 'Changement de statut du poste' : 'Suppression du poste'}
        description={
          confirmState.action === 'status'
            ? `Voulez-vous ${confirmDeactivates ? 'désactiver' : 'activer'} le poste "${confirmPosition?.name}" ? ${
                confirmDeactivates
                  ? "Il ne sera plus proposé pour de nouvelles affectations ; les affectations existantes restent consultables."
                  : 'Il pourra de nouveau recevoir des affectations.'
              }`
            : `Voulez-vous supprimer le poste "${confirmPosition?.name}" ? Les utilisateurs rattachés n'auront plus de poste. La suppression est refusée si des équipements y sont encore affectés.`
        }
        confirmText={confirmState.action === 'status' ? 'Changer le statut' : 'Supprimer le poste'}
        cancelText="Annuler"
        variant={confirmState.action === 'status' ? 'warning' : 'danger'}
      />
    </AppLayout>
  );
};
