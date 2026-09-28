import React, { useState, useEffect, useMemo } from 'react';
import { inventoryService, type Inventory } from '../../services/api';
import { Button } from '../../components/ui/Button';

interface InventoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  inventoryId: string | null;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  inventoryId,
}) => {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchItem, setSearchItem] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const fetchInventory = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryService.getById(id);
      setInventory(res.data?.data || null);
    } catch (err: any) {
      console.error('Erreur chargement détail inventaire:', err);
      setError('Impossible de charger les détails de cette campagne d\'inventaire.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && inventoryId) {
      fetchInventory(inventoryId);
      setSearchItem('');
    }
  }, [isOpen, inventoryId]);

  const items = useMemo(() => inventory?.items || [], [inventory]);

  const filteredItems = useMemo(() => {
    if (!searchItem.trim()) return items;
    const q = searchItem.toLowerCase();
    return items.filter((item) => {
      const name = item.equipment?.name?.toLowerCase() || '';
      const serial = item.equipment?.serialNumber?.toLowerCase() || '';
      return name.includes(q) || serial.includes(q) || item.equipmentId.includes(q);
    });
  }, [items, searchItem]);

  const stats = useMemo(() => {
    const total = items.length;
    const checked = items.filter((i) => i.checkedAt).length;
    const found = items.filter((i) => i.checkedAt && i.found).length;
    const missing = items.filter((i) => i.checkedAt && !i.found).length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, found, missing, percentage };
  }, [items]);

  const handleCheck = async (itemId: string, found: boolean, note?: string) => {
    setUpdatingItemId(itemId);
    try {
      await inventoryService.checkItem(itemId, { found, note });
      if (inventoryId) {
        await fetchInventory(inventoryId);
        onRefresh();
      }
    } catch (err: any) {
      console.error('Erreur récolement article:', err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleComplete = async () => {
    if (!inventory) return;
    if (!window.confirm('Êtes-vous sûr de vouloir clôturer définitivement cette campagne d\'inventaire ?')) return;

    setCompleting(true);
    try {
      await inventoryService.complete(inventory.id);
      if (inventoryId) {
        await fetchInventory(inventoryId);
        onRefresh();
      }
    } catch (err: any) {
      console.error('Erreur clôture inventaire:', err);
      alert('Impossible de clôturer la campagne d\'inventaire.');
    } finally {
      setCompleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-4xl shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined">fact_check</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {inventory?.title || 'Récolement d\'Inventaire'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span>Statut : <strong className={inventory?.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}>{inventory?.status === 'COMPLETED' ? 'Clôturé' : 'En cours'}</strong></span>
                <span>• Total : {stats.total} équipements</span>
              </div>
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

        {loading ? (
          <div className="py-16 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p>Chargement du détail de l'inventaire...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl my-4">
            <p>{error}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden my-4">
            {/* Progress & Stat Header */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-4 mb-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-4 text-body-sm">
                  <div>
                    <span className="text-on-surface-variant text-xs uppercase block">Taux d'Avancement</span>
                    <span className="font-headline-sm text-headline-sm font-bold text-primary">{stats.percentage}%</span>
                  </div>
                  <div className="border-l border-outline-variant/60 pl-4">
                    <span className="text-on-surface-variant text-xs uppercase block">Vérifiés</span>
                    <span className="font-semibold text-on-surface">{stats.checked} / {stats.total}</span>
                  </div>
                  <div className="border-l border-outline-variant/60 pl-4">
                    <span className="text-emerald-400 text-xs uppercase block">Trouvés</span>
                    <span className="font-semibold text-emerald-400">✓ {stats.found}</span>
                  </div>
                  <div className="border-l border-outline-variant/60 pl-4">
                    <span className="text-red-400 text-xs uppercase block">Manquants</span>
                    <span className="font-semibold text-red-400">✕ {stats.missing}</span>
                  </div>
                </div>

                {inventory?.status !== 'COMPLETED' && (
                  <Button
                    onClick={handleComplete}
                    disabled={completing}
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                    icon={<span className="material-symbols-outlined text-base">task_alt</span>}
                  >
                    {completing ? 'Clôture...' : 'Clôturer la Campagne'}
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Rechercher équipement par nom ou n° série..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-1.5 pl-9 pr-3 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto border border-outline-variant rounded-lg bg-surface-container">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl opacity-40 mb-1">find_in_page</span>
                  <p>Aucun équipement trouvé pour cet inventaire.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/30">
                  {filteredItems.map((item) => {
                    const isUpdating = updatingItemId === item.id;
                    const eqName = item.equipment?.name || 'Équipement non répertorié';
                    const eqSerial = item.equipment?.serialNumber || item.equipmentId;

                    return (
                      <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-high/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-sm shrink-0 ${
                            !item.checkedAt
                              ? 'bg-surface-container-high border-outline-variant text-on-surface-variant'
                              : item.found
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            <span className="material-symbols-outlined text-lg">
                              {!item.checkedAt ? 'devices' : item.found ? 'check_circle' : 'cancel'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-on-surface text-body-sm">{eqName}</span>
                              <span className="font-mono text-xs text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.2 rounded">
                                {eqSerial}
                              </span>
                            </div>
                            {item.note && (
                              <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">notes</span>
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {inventory?.status !== 'COMPLETED' ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleCheck(item.id, true)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                                item.checkedAt && item.found
                                  ? 'bg-emerald-500 text-black border-emerald-500'
                                  : 'bg-surface-container-lowest text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              Présent
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleCheck(item.id, false)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                                item.checkedAt && !item.found
                                  ? 'bg-red-500 text-white border-red-500'
                                  : 'bg-surface-container-lowest text-red-400 border-red-500/30 hover:bg-red-500/20'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                              Manquant
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold shrink-0">
                            {!item.checkedAt ? (
                              <span className="text-outline">Non vérifié</span>
                            ) : item.found ? (
                              <span className="text-emerald-400 flex items-center gap-1">✓ Présent</span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1">✕ Manquant</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-outline-variant shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
