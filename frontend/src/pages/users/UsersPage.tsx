import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { useClientPagination } from '../../hooks/useClientPagination';
import { AppLayout } from '../../components/layout/AppLayout';
import { userService, departmentService, type User, type Department } from '../../services/api';
import { UserModal } from './UserModal';
import { UserDetailModal } from './UserDetailModal';
import { Button } from '../../components/ui/Button';
import { getCountryByCode } from '../../data/countries';
import { getImageUrl } from '../../utils/imageUrl';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { accountErrorMessage } from '../../utils/accountErrors';
import { ConfirmPasswordPurgeModal } from '../../components/ui/ConfirmPasswordPurgeModal';

// Lu une fois : seule la gestion des comptes est réservée à l'administrateur (le serveur refuse les autres en 403)
const readIsAdmin = (): boolean => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'ADMIN';
  } catch {
    return false;
  }
};

export const UsersPage: React.FC = () => {
  const isAdmin = readIsAdmin();
  const [actionError, setActionError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    user: User | null;
    action: 'status' | 'delete';
  }>({
    isOpen: false,
    user: null,
    action: 'status',
  });

  // Purge state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const handleConfirmAction = async () => {
    const { user, action } = confirmModalState;
    if (!user) return;

    try {
      if (action === 'status') {
        const currentIsActive = user.isActive !== undefined ? user.isActive : (user.status !== 'INACTIF');
        const newIsActive = !currentIsActive;
        await userService.updateRole(user.id, {
          role: user.role,
          departmentId: user.departmentId || undefined,
          isActive: newIsActive,
          status: newIsActive ? 'ACTIF' : 'INACTIF',
        });
      } else if (action === 'delete') {
        await userService.delete(user.id);
      }
      fetchUsersAndDepartments();
    } catch (err: any) {
      console.error(`Erreur ${action} utilisateur:`, err);
      setActionError(accountErrorMessage(err, "L'action a échoué."));
    } finally {
      setConfirmModalState({ isOpen: false, user: null, action: 'status' });
    }
  };

  const handlePurge = async (password: string) => {
    try {
      setPurgeLoading(true);
      setPurgeError(null);
      await userService.purge(password);
      setIsPurgeModalOpen(false);
      fetchUsersAndDepartments();
    } catch (err: any) {
      setPurgeError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Erreur lors du vidage des utilisateurs'
      );
    } finally {
      setPurgeLoading(false);
    }
  };
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Detail Modal state (Read only - Eye icon)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const fetchUsersAndDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        userService.getAll(),
        departmentService.getAll(),
      ]);
      setUsers(usersRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
    } catch (err: any) {
      console.error('Erreur chargement utilisateurs:', err);
      setError('Impossible de charger la liste des utilisateurs depuis le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndDepartments();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = u.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      const nameMatch = fullName.includes(searchTerm.toLowerCase());
      const matchesSearch = emailMatch || nameMatch || phoneMatch;

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesDept = deptFilter === 'ALL' || u.departmentId === deptFilter;

      const isActive = u.isActive !== undefined ? u.isActive : (u.status !== 'INACTIF');
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIF' && isActive) ||
        (statusFilter === 'INACTIF' && !isActive);

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, deptFilter, statusFilter]);

  // Pagination dans le navigateur ; les statistiques ci-dessous portent sur tous les utilisateurs
  const paging = useClientPagination(filteredUsers, [searchTerm, roleFilter, deptFilter, statusFilter].join('|'));

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const responsables = users.filter((u) => u.role === 'RESPONSABLE').length;
    const employes = users.filter((u) => u.role === 'EMPLOYE').length;
    return { total, admins, responsables, employes };
  }, [users]);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'RESPONSABLE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'AUDITEUR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <AppLayout
      title="Gestion des Utilisateurs"
      subtitle="Gérez l'ensemble des membres de votre organisation, leurs rôles et départements."
    >
      {/* Top Action Bar & Stat Cards */}
      <div className="flex flex-col gap-lg mb-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Utilisateurs</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">{stats.total}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">group</span>
            </div>
          </div>

          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Administrateurs</p>
              <h3 className="font-headline-lg text-headline-lg text-purple-400 font-bold mt-1">{stats.admins}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>
          </div>

          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Responsables</p>
              <h3 className="font-headline-lg text-headline-lg text-blue-400 font-bold mt-1">{stats.responsables}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-2xl">manage_accounts</span>
            </div>
          </div>

          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-md flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Employés</p>
              <h3 className="font-headline-lg text-headline-lg text-emerald-400 font-bold mt-1">{stats.employes}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
          </div>
        </div>

        {/* Filters and Add Button */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col md:flex-row items-center justify-between gap-md">
          <div className="flex flex-wrap items-center gap-md w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-9 pr-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tous les Rôles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="RESPONSABLE">RESPONSABLE</option>
              <option value="EMPLOYE">EMPLOYE</option>
              <option value="AUDITEUR">AUDITEUR</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tous les Départements</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
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

          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPurgeError(null);
                  setIsPurgeModalOpen(true);
                }}
                className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-medium rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">delete_sweep</span>
                <span>Vider la liste</span>
              </button>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setIsModalOpen(true);
                }}
                icon={<span className="material-symbols-outlined text-xl">person_add</span>}
              >
                Nouvel Utilisateur
              </Button>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mb-4 p-3 rounded-lg border border-error/40 bg-error/10 text-error text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="underline cursor-pointer">Fermer</button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : error ? (
          <div className="p-lg text-center text-error bg-error/10 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl">error</span>
            <p>{error}</p>
            <Button variant="outline" className="mt-2" onClick={fetchUsersAndDepartments}>
              Réessayer
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl opacity-50">group_off</span>
            <p className="font-headline-sm text-headline-sm text-on-surface">Aucun utilisateur trouvé</p>
            <p className="text-body-sm">Essayez de modifier vos termes de recherche ou créez un nouvel utilisateur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Email & Téléphone</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Département</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body-md text-on-surface">
                {paging.pageItems.map((user) => {
                  const dept = departments.find((d) => d.id === user.departmentId) || user.department;
                  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
                  const isActive = user.isActive !== undefined ? user.isActive : (user.status !== 'INACTIF');
                  const country = getCountryByCode(user.countryCode);

                  return (
                    <tr key={user.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {user.avatarUrl ? (
                              <img src={getImageUrl(user.avatarUrl)} alt={fullName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="font-semibold text-on-surface">{fullName}</span>
                          {user.linked === false && (
                            <span
                              className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-amber-500/40 bg-amber-500/10 text-amber-400"
                              title="Aucun compte de connexion relié : le rôle et l'état de cette fiche n'ont pas d'effet sur l'accès"
                            >
                              Sans compte
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant text-body-sm">
                        <div className="flex flex-col">
                          <span>{user.email}</span>
                          {user.phone && (
                            <span className="text-xs text-outline flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">call</span>
                              {country ? `${country.flag} ${country.dialCode} ` : ''}
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant text-body-sm">
                        {dept?.name ? (
                          <span className="inline-flex items-center gap-1.5 bg-surface-container-highest px-2.5 py-1 rounded-md border border-outline-variant">
                            <span className="material-symbols-outlined text-xs text-primary">lan</span>
                            {dept.name}
                          </span>
                        ) : (
                          <span className="text-outline italic">Non assigné</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setConfirmModalState({ isOpen: true, user, action: 'status' })}
                          disabled={!isAdmin}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                          }`}
                          title="Cliquer pour basculer le statut Actif / Inactif"
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          <span>{isActive ? 'ACTIF' : 'INACTIF'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Eye icon: View Details (Read only) */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingUser(user);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-tertiary hover:bg-tertiary/10 transition-colors cursor-pointer"
                            title="Voir les détails"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          
                          {/* Édition et suppression : réservées à l'administrateur (le serveur refuse les autres) */}
                          {isAdmin && (
                            <>
                              {/* Edit icon */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(user);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              
                              {/* Delete icon */}
                              <button
                                type="button"
                                onClick={() => setConfirmModalState({ isOpen: true, user, action: 'delete' })}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
              page={paging.page}
              pageSize={paging.pageSize}
              total={paging.total}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
            />
      </div>

      {/* Edit/Create User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchUsersAndDepartments}
        userToEdit={editingUser}
      />

      {/* Read-only User Detail Modal (Eye Icon) */}
      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={viewingUser}
        departments={departments}
      />

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, user: null, action: 'status' })}
        onConfirm={handleConfirmAction}
        title={
          confirmModalState.action === 'status'
            ? `Bascule du statut d'utilisateur`
            : `Suppression de l'utilisateur`
        }
        description={
          confirmModalState.action === 'status'
            ? `Êtes-vous sûr de vouloir ${
                confirmModalState.user?.isActive !== false && confirmModalState.user?.status !== 'INACTIF' ? 'désactiver' : 'activer'
              } l'utilisateur "${confirmModalState.user?.firstName} ${confirmModalState.user?.lastName}" ?`
            : `Êtes-vous sûr de vouloir supprimer définitivement le profil de "${confirmModalState.user?.firstName} ${confirmModalState.user?.lastName}" ? Cette action est irréversible.`
        }
        confirmText={confirmModalState.action === 'status' ? 'Changer le statut' : 'Supprimer l\'utilisateur'}
        cancelText="Annuler"
        variant={confirmModalState.action === 'status' ? 'warning' : 'danger'}
      />

      <ConfirmPasswordPurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onConfirm={handlePurge}
        title="Vider la liste des utilisateurs"
        description="Cette action supprimera tous les utilisateurs standards (non-administrateurs) et révoquera leurs accès. Votre compte et les autres comptes administrateurs seront préservés."
        loading={purgeLoading}
        error={purgeError}
      />
    </AppLayout>
  );
};

