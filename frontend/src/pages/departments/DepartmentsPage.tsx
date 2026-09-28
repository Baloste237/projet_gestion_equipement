import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { departmentService, type Department } from '../../services/api';
import { DepartmentModal } from './DepartmentModal';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Confirmation Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    dept: Department | null;
    action: 'status' | 'delete';
  }>({
    isOpen: false,
    dept: null,
    action: 'status',
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.data || []);
    } catch (err: any) {
      console.error('Erreur chargement départements:', err);
      setError('Impossible de charger la liste des départements depuis le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleConfirmAction = async () => {
    const { dept, action } = confirmModalState;
    if (!dept) return;

    try {
      if (action === 'status') {
        const currentIsActive = dept.isActive !== undefined ? dept.isActive : (dept.status !== 'INACTIF');
        const newStatus = currentIsActive ? 'INACTIF' : 'ACTIF';
        await departmentService.update(dept.id, {
          name: dept.name,
          description: dept.description || undefined,
          status: newStatus,
          isActive: !currentIsActive,
        });
      } else if (action === 'delete') {
        await departmentService.delete(dept.id);
      }
      fetchDepartments();
    } catch (err: any) {
      console.error(`Erreur ${action} département:`, err);
    } finally {
      setConfirmModalState({ isOpen: false, dept: null, action: 'status' });
    }
  };

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const nameMatch = d.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const descMatch = d.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || descMatch;

      const isActive = d.isActive !== undefined ? d.isActive : (d.status !== 'INACTIF');
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIF' && isActive) ||
        (statusFilter === 'INACTIF' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchTerm, statusFilter]);

  return (
    <AppLayout
      title="Gestion des Départements"
      subtitle="Organisez vos structures et équipes opérationnelles au sein d'EQUIP-CORE."
    >
      {/* Top Bar with Search, Status Filter & Create Button */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col md:flex-row items-center justify-between gap-md mb-lg">
        <div className="flex flex-wrap items-center gap-md w-full md:w-auto">
          <div className="relative flex-1 md:w-72 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Rechercher un département..."
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
            <option value="ACTIF">ACTIF</option>
            <option value="INACTIF">INACTIF</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setEditingDepartment(null);
            setIsModalOpen(true);
          }}
          icon={<span className="material-symbols-outlined text-xl">add_business</span>}
        >
          Nouveau Département
        </Button>
      </div>

      {/* Grid of Departments */}
      {loading ? (
        <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
          <p>Chargement des départements...</p>
        </div>
      ) : error ? (
        <div className="p-lg text-center text-error bg-error/10 border border-error/30 rounded-xl flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-3xl">error</span>
          <p>{error}</p>
          <Button variant="outline" className="mt-2" onClick={fetchDepartments}>
            Réessayer
          </Button>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-4xl opacity-50">domain_disabled</span>
          <p className="font-headline-sm text-headline-sm text-on-surface">Aucun département trouvé</p>
          <p className="text-body-sm">Créez votre premier département pour organiser les utilisateurs et équipements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {filteredDepartments.map((dept) => {
            const memberCount = dept.usersCount ?? (dept.users?.length || 0);
            const isActive = dept.isActive !== undefined ? dept.isActive : (dept.status !== 'INACTIF');

            return (
              <div
                key={dept.id}
                className="bg-surface-container border border-outline-variant hover:border-primary/50 rounded-xl p-lg flex flex-col justify-between transition-all duration-200 hover:shadow-xl group"
              >
                <div>
                  <div className="flex items-start justify-between mb-sm">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined">lan</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmModalState({ isOpen: true, dept, action: 'status' })}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                        }`}
                        title="Cliquer pour basculer le statut Actif / Inactif"
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                        <span>{isActive ? 'ACTIF' : 'INACTIF'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingDepartment(dept);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmModalState({ isOpen: true, dept, action: 'delete' })}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
                    {dept.name}
                  </h3>

                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 mb-md">
                    {dept.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="pt-md border-t border-outline-variant/40 flex items-center justify-between text-body-sm">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-base text-primary">group</span>
                    <span>{memberCount} membre{memberCount > 1 ? 's' : ''}</span>
                  </div>

                  <span className="font-label-sm text-[11px] text-outline uppercase tracking-widest">
                    ID: {dept.id.substring(0, 8)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Département */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDepartments}
        departmentToEdit={editingDepartment}
      />

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, dept: null, action: 'status' })}
        onConfirm={handleConfirmAction}
        title={
          confirmModalState.action === 'status'
            ? `Bascule du statut du département`
            : `Suppression du département`
        }
        description={
          confirmModalState.action === 'status'
            ? `Êtes-vous sûr de vouloir ${
                confirmModalState.dept?.isActive !== false && confirmModalState.dept?.status !== 'INACTIF' ? 'désactiver' : 'activer'
              } le département "${confirmModalState.dept?.name}" ? Tous ses membres basculeront automatiquement.`
            : `Êtes-vous sûr de vouloir supprimer le département "${confirmModalState.dept?.name}" ? Les membres rattachés basculeront à "Aucun".`
        }
        confirmText={confirmModalState.action === 'status' ? 'Changer le statut' : 'Supprimer le département'}
        cancelText="Annuler"
        variant={confirmModalState.action === 'status' ? 'warning' : 'danger'}
      />
    </AppLayout>
  );
};
