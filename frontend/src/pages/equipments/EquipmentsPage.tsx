import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  type Equipment,
  type Category,
  type EquipmentStatus,
  equipmentService,
  categoryService,
} from '../../services/api';
import { EquipmentModal } from './EquipmentModal';
import { ImportEquipmentsModal } from './ImportEquipmentsModal';
import { getImageUrl } from '../../utils/imageUrl';
import { downloadBlob } from '../../utils/download';
import { getBlobErrorMessage } from '../../utils/apiError';
import { exportFilename } from '../../utils/importMapping';
import { EQUIPMENT_STATUSES, EQUIPMENT_STATUS_LABELS, parseStatusParam } from '../../utils/equipmentStatus';

export const EquipmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  // Le tableau de bord ouvre la liste déjà filtrée : /equipments?status=IN_MAINTENANCE
  const [selectedStatus, setSelectedStatus] = useState<string>(() => parseStatusParam(searchParams.get('status')));

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);

  // Delete state
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import / export state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Ferme le menu d'export au clic à l'extérieur ou sur Échap
  useEffect(() => {
    if (!isExportMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) setIsExportMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExportMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isExportMenuOpen]);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExportMenuOpen(false);
    setExporting(true);
    setExportError(null);
    try {
      const res = await equipmentService.exportFile(format);
      downloadBlob(res.data as Blob, exportFilename(format));
    } catch (err) {
      console.error("Erreur lors de l'export:", err);
      setExportError(await getBlobErrorMessage(err, "L'export a échoué : aucun fichier n'a été téléchargé."));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eqRes, catRes] = await Promise.all([
        equipmentService.getAll(),
        categoryService.getAll(),
      ]);
      setEquipments(eqRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des équipements:', err);
      setError('Impossible de charger la liste des équipements.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEquipmentToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (equipment: Equipment) => {
    setEquipmentToEdit(equipment);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!equipmentToDelete) return;
    setDeleteLoading(true);
    try {
      await equipmentService.delete(equipmentToDelete.id);
      setEquipmentToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      alert(err.response?.data?.error?.message || 'Erreur lors de la suppression de l\'équipement');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredEquipments = equipments.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.category?.name && eq.category.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory ? eq.categoryId === selectedCategory : true;
    const matchesStatus = selectedStatus ? eq.status === selectedStatus : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            Disponible
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Assigné
          </span>
        );
      case 'IN_MAINTENANCE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            En Maintenance
          </span>
        );
      case 'RETIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Hors Service
          </span>
        );
      case 'A_COMPLETER':
        return (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1.5 w-fit"
            title="Numéro de série ou catégorie à renseigner"
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
            {EQUIPMENT_STATUS_LABELS.A_COMPLETER}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-variant text-on-surface-variant flex items-center gap-1.5 w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <AppLayout title="Parc d'Équipements" subtitle="Gestion centralisée du matériel et équipements de l'entreprise">
      <div className="flex flex-col gap-6">
        {/* Header Actions & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#1A1A1A] p-4 rounded-xl border border-[#262626]">
          {/* Search and Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Rechercher par nom, n° de série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              {EQUIPMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {EQUIPMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {/* Import / Export / Create Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-2 bg-[#0D0D0D] border border-[#333333] text-on-surface font-medium rounded-lg text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              <span>Importer</span>
            </button>

            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((open) => !open)}
                disabled={exporting}
                aria-haspopup="menu"
                aria-expanded={isExportMenuOpen}
                className="px-3 py-2 bg-[#0D0D0D] border border-[#333333] text-on-surface font-medium rounded-lg text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-lg ${exporting ? 'animate-spin' : ''}`}>
                  {exporting ? 'sync' : 'download'}
                </span>
                <span>{exporting ? 'Export...' : 'Exporter'}</span>
                <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
              {isExportMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-48 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-xl z-20 overflow-hidden"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2.5 text-sm text-left text-on-surface hover:bg-[#262626] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">csv</span>
                    CSV (.csv)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleExport('xlsx')}
                    className="w-full px-4 py-2.5 text-sm text-left text-on-surface hover:bg-[#262626] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">table_view</span>
                    Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Enregistrer un Actif</span>
            </button>
          </div>
        </div>

        {/* Export Error Alert */}
        {exportError && (
          <div role="alert" className="bg-error/10 border border-error/30 text-error p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span>{exportError}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-xs underline hover:no-underline font-medium"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-error/10 border border-error/30 text-error p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="text-xs underline hover:no-underline font-medium"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Table View */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#141414] text-on-surface-variant font-label-md text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Équipement</th>
                  <th className="py-3.5 px-4 font-semibold">Catégorie</th>
                  <th className="py-3.5 px-4 font-semibold">N° de Série</th>
                  <th className="py-3.5 px-4 font-semibold">Fournisseur</th>
                  <th className="py-3.5 px-4 font-semibold">Statut</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                          sync
                        </span>
                        <span className="text-sm">Chargement des équipements...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEquipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-outline-variant">
                          inventory_2
                        </span>
                        <p className="text-base font-medium text-on-surface">Aucun équipement trouvé</p>
                        <p className="text-xs text-on-surface-variant">
                          Essayez de modifier vos filtres ou ajoutez un nouvel équipement.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEquipments.map((equipment) => (
                    <tr
                      key={equipment.id}
                      className="hover:bg-[#222222] transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#262626] border border-[#333333] flex items-center justify-center text-primary shrink-0 overflow-hidden">
                            {equipment.imageUrl ? (
                              <img
                                src={getImageUrl(equipment.imageUrl)}
                                alt={equipment.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-lg">
                                {equipment.category?.name?.toLowerCase().includes('server')
                                  ? 'dns'
                                  : equipment.category?.name?.toLowerCase().includes('laptop')
                                  ? 'laptop'
                                  : 'devices'}
                              </span>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/equipments/${equipment.id}`)}
                              className="font-medium text-on-surface hover:text-primary transition-colors text-sm text-left block"
                            >
                              {equipment.name}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-sm text-on-surface-variant">
                        {equipment.category?.name || 'Non catégorisé'}
                      </td>

                      {/* Serial Number */}
                      <td className="py-3.5 px-4 text-sm font-mono text-on-surface">
                        {equipment.serialNumber}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 text-sm text-on-surface-variant">
                        {equipment.supplier?.name || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(equipment.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/equipments/${equipment.id}`)}
                            title="Voir les détails"
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-[#333333] rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(equipment)}
                            title="Modifier"
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-[#333333] rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEquipmentToDelete(equipment)}
                            title="Supprimer"
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Table Info */}
          <div className="px-4 py-3 border-t border-[#262626] bg-[#141414] flex items-center justify-between text-xs text-on-surface-variant">
            <span>
              Affichage de <strong className="text-on-surface">{filteredEquipments.length}</strong> sur{' '}
              <strong className="text-on-surface">{equipments.length}</strong> équipements
            </span>
          </div>
        </div>

        {/* Modal d'import */}
        <ImportEquipmentsModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImported={fetchData}
        />

        {/* Modal for Add / Edit */}
        <EquipmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          equipmentToEdit={equipmentToEdit}
        />

        {/* Delete Confirmation Modal */}
        {equipmentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#262626] border border-[#333333] rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-error">
                <span className="material-symbols-outlined text-3xl">warning</span>
                <h3 className="text-lg font-bold text-on-surface">Confirmer la suppression</h3>
              </div>
              <p className="text-sm text-on-surface-variant">
                Êtes-vous sûr de vouloir supprimer l'équipement{' '}
                <strong className="text-on-surface">{equipmentToDelete.name}</strong> (S/N:{' '}
                {equipmentToDelete.serialNumber}) ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEquipmentToDelete(null)}
                  className="px-4 py-2 text-sm rounded text-on-surface hover:bg-surface-variant transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm rounded bg-error text-white font-medium hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteLoading && <span className="material-symbols-outlined animate-spin text-base">sync</span>}
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
