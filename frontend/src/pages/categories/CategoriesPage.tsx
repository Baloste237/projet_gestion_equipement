import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { useClientPagination } from '../../hooks/useClientPagination';
import { AppLayout } from '../../components/layout/AppLayout';
import { categoryService, type Category } from '../../services/api';
import { CategoryModal } from './CategoryModal';
import { ImportCategoriesModal } from './ImportCategoriesModal';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { categoryErrorMessage } from '../../utils/categoryErrors';
import { readIsAdmin } from '../../utils/session';
import { ConfirmPasswordPurgeModal } from '../../components/ui/ConfirmPasswordPurgeModal';

// Lu une fois : sert à n'afficher les actions d'écriture qu'à un administrateur (le serveur refuse les autres en 403)
const isAdmin = readIsAdmin();

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Purge state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryService.getAll();
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError('Impossible de charger la liste des catégories depuis le serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await categoryService.delete(categoryToDelete.id);
      await fetchCategories();
    } catch (err) {
      console.error('Erreur suppression catégorie:', err);
      setActionError(categoryErrorMessage(err, 'Impossible de supprimer la catégorie.'));
    } finally {
      setDeleting(false);
      setCategoryToDelete(null);
    }
  };

  const handlePurge = async (password: string) => {
    try {
      setPurgeLoading(true);
      setPurgeError(null);
      await categoryService.purge(password);
      setIsPurgeModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setPurgeError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Erreur lors du vidage des catégories'
      );
    } finally {
      setPurgeLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // Pagination dans le navigateur ; le pied de tableau compte toutes les catégories
  const paging = useClientPagination(filteredCategories, searchTerm);

  const totalEquipments = useMemo(() => categories.reduce((sum, c) => sum + (c.equipmentCount ?? 0), 0), [categories]);

  return (
    <AppLayout
      title="Catégories"
      subtitle="Classez vos équipements par catégorie. Seuls les administrateurs peuvent modifier cette liste."
    >
      <div className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-col md:flex-row items-center justify-between gap-md mb-lg">
        <div className="relative flex-1 md:max-w-sm w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-9 pr-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
          />
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
            <Button variant="outline" onClick={() => setIsImportOpen(true)} icon={<span className="material-symbols-outlined text-xl">upload_file</span>}>
              Importer
            </Button>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setIsModalOpen(true);
              }}
              icon={<span className="material-symbols-outlined text-xl">add</span>}
            >
              Nouvelle catégorie
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="mb-md bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center justify-between gap-2" role="alert">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {actionError}
          </span>
          <button type="button" onClick={() => setActionError(null)} className="cursor-pointer" aria-label="Fermer le message">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
          <p>Chargement des catégories...</p>
        </div>
      ) : error ? (
        <div className="p-lg text-center text-error bg-error/10 border border-error/30 rounded-xl flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-3xl">error</span>
          <p>{error}</p>
          <Button variant="outline" className="mt-2" onClick={fetchCategories}>
            Réessayer
          </Button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-xl text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-4xl opacity-50">category</span>
          <p className="font-headline-sm text-headline-sm text-on-surface">Aucune catégorie trouvée</p>
          <p className="text-body-sm">
            {isAdmin ? 'Créez une catégorie ou importez une liste depuis un fichier.' : 'Aucune catégorie ne correspond à la recherche.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-high text-on-surface-variant uppercase tracking-wider font-label-sm text-label-sm">
                <tr>
                  <th className="py-3 px-4 font-medium">Catégorie</th>
                  <th className="py-3 px-4 font-medium">Description</th>
                  <th className="py-3 px-4 font-medium text-right">Équipements</th>
                  {isAdmin && <th className="py-3 px-4 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {paging.pageItems.map((category) => {
                  const count = category.equipmentCount ?? 0;
                  return (
                    <tr key={category.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-on-surface">{category.name}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{category.description || '—'}</td>
                      <td className="py-3 px-4 text-right text-on-surface">{count}</td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(category);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(category)}
                              disabled={count > 0}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant disabled:hover:bg-transparent"
                              title={count > 0 ? `Utilisée par ${count} équipement${count > 1 ? 's' : ''} : suppression impossible` : 'Supprimer'}
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
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
          <div className="px-4 py-3 border-t border-outline-variant/40 text-body-sm text-on-surface-variant">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} · {totalEquipments} équipement{totalEquipments > 1 ? 's' : ''} classé{totalEquipments > 1 ? 's' : ''}
          </div>
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCategories}
        categoryToEdit={editingCategory}
      />

      <ImportCategoriesModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImported={fetchCategories} />

      <ConfirmModal
        isOpen={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Suppression de la catégorie"
        description={`Êtes-vous sûr de vouloir supprimer la catégorie « ${categoryToDelete?.name} » ? Cette action est définitive.`}
        confirmText="Supprimer la catégorie"
        cancelText="Annuler"
        variant="danger"
        loading={deleting}
      />

      <ConfirmPasswordPurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onConfirm={handlePurge}
        title="Vider la liste des catégories"
        description="Cette action supprimera définitivement toutes les catégories. Tous les équipements doivent d'abord être supprimés pour que cette action soit autorisée."
        loading={purgeLoading}
        error={purgeError}
      />
    </AppLayout>
  );
};
