import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { inventoryService, type Inventory } from '../../services/api';
import { NewInventoryModal } from './NewInventoryModal';
import { InventoryDetailModal } from './InventoryDetailModal';
import { Button } from '../../components/ui/Button';

export const InventoriesPage: React.FC = () => {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);

  const fetchInventories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryService.getAll();
      setInventories(res.data?.data || []);
    } catch (err: any) {
      console.error('Erreur chargement inventaires:', err);
      setError('Impossible de charger la liste des campagnes d\'inventaire.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  // Stats computation
  const stats = useMemo(() => {
    let activeCampaigns = 0;
    let completedCampaigns = 0;
    let totalMissingItems = 0;

    inventories.forEach((inv) => {
      if (inv.status === 'IN_PROGRESS') {
        activeCampaigns++;
      } else {
        completedCampaigns++;
      }

      if (inv.items) {
        inv.items.forEach((item) => {
          if (item.checkedAt && !item.found) {
            totalMissingItems++;
          }
        });
      }
    });

    return { activeCampaigns, completedCampaigns, totalMissingItems };
  }, [inventories]);

  // Filtered List
  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      const matchesTitle = inv.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesTitle && matchesStatus;
    });
  }, [inventories, searchTerm, statusFilter]);

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

  return (
    <AppLayout
      title="Gestion des Stocks & Inventaires"
      subtitle="Campagnes de récolement, suivi terrain des équipements et comptage du matériel."
    >
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <div>
            <span className="font-label-md text-label-md text-primary tracking-widest uppercase mb-1 block opacity-80">
              Component Stock Management
            </span>
            <h2 className="font-display-lg text-display-lg font-bold text-on-surface">
              Inventaires & Récolements
            </h2>
          </div>

          <Button
            onClick={() => setIsNewModalOpen(true)}
            icon={<span className="material-symbols-outlined text-xl">add</span>}
          >
            Lancer un Inventaire
          </Button>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Active Inventories */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Campagnes en Cours</h3>
              <span className="material-symbols-outlined text-primary">inventory_2</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold mb-1">
              {stats.activeCampaigns}
            </p>
            <div className="flex items-center gap-1 text-primary text-xs font-medium">
              <span className="material-symbols-outlined text-sm">pending_actions</span>
              <span>{inventories.length} campagnes enregistrées au total</span>
            </div>
          </div>

          {/* Card 2: Missing Items Alerts */}
          <div className="bg-[#1A1A1A] border border-[#93000a] rounded-xl p-5 relative overflow-hidden shadow-[0_0_24px_rgba(147,0,10,0.1)]">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-red-400">Équipements Manquants</h3>
              <span className="material-symbols-outlined text-red-400">warning</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold mb-1">
              {stats.totalMissingItems} <span className="text-body-sm font-normal text-on-surface-variant">anomalies</span>
            </p>
            <div className="flex items-center gap-1 text-on-surface-variant text-xs">
              <span>Nécessite un suivi ou renouvellement</span>
            </div>
          </div>

          {/* Card 3: Clôturés */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Campagnes Clôturées</h3>
              <span className="material-symbols-outlined text-emerald-400">task_alt</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-emerald-400 font-bold mb-1">
              {stats.completedCampaigns}
            </p>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span>Récolements terminés et archivés</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Rechercher une campagne..."
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
              <option value="IN_PROGRESS">EN COURS</option>
              <option value="COMPLETED">CLÔTURÉS</option>
            </select>
          </div>

          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {filteredInventories.length} campagne{filteredInventories.length > 1 ? 's' : ''} d'inventaire
          </span>
        </div>

        {/* Inventory Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p>Chargement des inventaires...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl">error</span>
            <p>{error}</p>
            <Button variant="outline" className="mt-2" onClick={fetchInventories}>
              Réessayer
            </Button>
          </div>
        ) : filteredInventories.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2 bg-surface-container border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined text-4xl opacity-50">inventory_2</span>
            <p className="font-headline-sm text-headline-sm text-on-surface">Aucune campagne d'inventaire trouvée</p>
            <p className="text-body-sm">Lancez une nouvelle campagne pour commencer le récolement du parc d'équipements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventories.map((inv) => {
              const items = inv.items || [];
              const totalItems = items.length;
              const checkedItems = items.filter((i) => i.checkedAt).length;
              const foundItems = items.filter((i) => i.checkedAt && i.found).length;
              const missingItems = items.filter((i) => i.checkedAt && !i.found).length;
              const percentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
              const isCompleted = inv.status === 'COMPLETED';

              return (
                <div
                  key={inv.id}
                  className="bg-[#1A1A1A] border border-[#262626] hover:border-outline-variant rounded-xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm group"
                >
                  <div>
                    {/* Header Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-primary font-bold">
                        <span className="material-symbols-outlined">fact_check</span>
                      </div>

                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isCompleted ? '✓ CLÔTURÉ' : '● EN COURS'}
                      </span>
                    </div>

                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {inv.title}
                    </h3>

                    <p className="text-xs text-on-surface-variant mb-4">
                      Débuté le {formatDate(inv.startedAt)}
                      {inv.completedAt && ` • Clôturé le ${formatDate(inv.completedAt)}`}
                    </p>

                    {/* Progress details */}
                    <div className="bg-surface-container border border-outline-variant/60 rounded-lg p-3 mb-4 space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-on-surface-variant">Progression récolement</span>
                        <span className="text-primary font-bold">{percentage}% ({checkedItems}/{totalItems})</span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-surface-container-lowest overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/30">
                        <span className="text-emerald-400 font-medium">✓ {foundItems} trouvés</span>
                        {missingItems > 0 ? (
                          <span className="text-red-400 font-medium">✕ {missingItems} manquants</span>
                        ) : (
                          <span>0 manquant</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <Button
                    onClick={() => setSelectedInventoryId(inv.id)}
                    variant={isCompleted ? 'outline' : 'primary'}
                    className="w-full justify-center"
                    icon={<span className="material-symbols-outlined text-base">checklist</span>}
                  >
                    {isCompleted ? 'Consulter le Récolement' : 'Ouvrir le Récolement'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewInventoryModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={fetchInventories}
      />

      <InventoryDetailModal
        isOpen={!!selectedInventoryId}
        onClose={() => setSelectedInventoryId(null)}
        onRefresh={fetchInventories}
        inventoryId={selectedInventoryId}
      />
    </AppLayout>
  );
};
