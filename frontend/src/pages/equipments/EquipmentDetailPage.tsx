import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { type Equipment, type EquipmentStatus, equipmentService } from '../../services/api';
import { EquipmentModal } from './EquipmentModal';
import { getImageUrl } from '../../utils/imageUrl';
import { conditionLabel, formatServiceDate } from '../../utils/equipmentLifecycle';
import { QrCodeImage } from '../../components/QrCodeImage';
import { getPublicAppUrl } from '../../config/publicUrl';
import { equipmentQrUrl, qrFilename } from '../../utils/qrCode';
import { downloadDataUrl } from '../../utils/download';

export const EquipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    if (id) {
      fetchEquipmentDetail(id);
    }
  }, [id]);

  const fetchEquipmentDetail = async (equipmentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await equipmentService.getById(equipmentId);
      setEquipment(res.data.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des détails de l\'équipement:', err);
      setError('Équipement introuvable ou erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!equipment) return;
    if (window.confirm(`Voulez-vous vraiment supprimer l'équipement "${equipment.name}" ?`)) {
      try {
        await equipmentService.delete(equipment.id);
        navigate('/equipments');
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Impossible de supprimer cet équipement.');
      }
    }
  };

  const renderStatusBadge = (status?: EquipmentStatus) => {
    if (!status) return null;
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Disponible
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Assigné
          </span>
        );
      case 'IN_MAINTENANCE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            En Maintenance
          </span>
        );
      case 'RETIRED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            Hors Service
          </span>
        );
      case 'A_COMPLETER':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1.5 w-fit">
            <span className="material-symbols-outlined text-sm">edit_note</span>
            À compléter
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant flex items-center gap-1.5 w-fit">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <AppLayout title="Détail de l'équipement">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
          <p className="text-sm">Chargement des données de l'équipement...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !equipment) {
    return (
      <AppLayout title="Détail de l'équipement">
        <div className="bg-error/10 border border-error/30 text-error p-6 rounded-xl flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-4xl">error</span>
          <p className="text-lg font-medium">{error || 'Équipement introuvable.'}</p>
          <button
            onClick={() => navigate('/equipments')}
            className="px-4 py-2 bg-surface-variant text-on-surface rounded-lg text-sm hover:bg-surface-container-high transition-colors"
          >
            Retour au parc d'équipements
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Breadcrumb & Navigation */}
        <nav className="flex items-center gap-2 text-on-surface-variant text-xs font-medium">
          <Link to="/equipments" className="hover:text-primary transition-colors">
            Équipements
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface-variant/70">{equipment.category?.name || 'Matériel'}</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface font-semibold">{equipment.name}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-[#1A1A1A] p-6 rounded-xl border border-[#262626]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight m-0">
                {equipment.name}
              </h1>
              {renderStatusBadge(equipment.status)}
            </div>
            <p className="text-sm text-on-surface-variant font-mono">
              ID Actif: <span className="text-on-surface">{equipment.id}</span> • N° Série:{' '}
              <span className="text-primary">{equipment.serialNumber}</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-variant transition-colors border border-outline-variant rounded-lg text-sm text-on-surface font-medium"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              <span>Modifier</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error border border-error/30 transition-colors rounded-lg text-sm font-medium"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              <span>Supprimer</span>
            </button>
            <button
              onClick={() => navigate('/equipments')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 transition-colors rounded-lg text-sm font-medium"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Retour</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 cols): Specs & Visual */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Visual Icon / Card */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#262626] overflow-hidden flex flex-col">
              <div className="aspect-video w-full bg-[#121212] flex flex-col items-center justify-center p-6 text-primary border-b border-[#262626] overflow-hidden relative">
                {equipment.imageUrl ? (
                  <img
                    src={getImageUrl(equipment.imageUrl)}
                    alt={equipment.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-6xl">
                      {equipment.category?.name?.toLowerCase().includes('server')
                        ? 'dns'
                        : equipment.category?.name?.toLowerCase().includes('laptop')
                        ? 'laptop'
                        : 'devices'}
                    </span>
                    <span className="text-xs font-mono text-on-surface-variant mt-2">
                      {equipment.serialNumber}
                    </span>
                  </>
                )}
              </div>
              <div className="p-4 flex items-center gap-4">
                <QrCodeImage
                  value={equipmentQrUrl(equipment.id, getPublicAppUrl())}
                  size={96}
                  alt={`Code QR de ${equipment.name}`}
                  onReady={setQrDataUrl}
                />
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                    <span className="material-symbols-outlined text-base">qr_code_2</span>
                    <span>Code QR d'identification</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Scanné avec un téléphone, il ouvre la fiche publique de cet équipement.
                  </p>
                  <button
                    type="button"
                    disabled={!qrDataUrl}
                    onClick={() => qrDataUrl && downloadDataUrl(qrDataUrl, qrFilename(equipment.serialNumber))}
                    className="self-start inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    Télécharger le QR code
                  </button>
                </div>
              </div>
            </div>

            {/* Specs Card */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#262626] p-5 flex flex-col gap-4">
              <h3 className="text-base font-bold text-on-surface border-b border-[#262626] pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">info</span>
                <span>Spécifications & Propriétés</span>
              </h3>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Nom</span>
                  <span className="text-on-surface font-semibold">{equipment.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Catégorie</span>
                  <span className="text-on-surface font-medium">{equipment.category?.name || 'Non spécifiée'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Numéro de série</span>
                  <span className="text-on-surface font-mono font-medium">{equipment.serialNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Fournisseur</span>
                  <span className="text-on-surface font-medium">{equipment.supplier?.name || 'Non renseigné'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">État de fonctionnement</span>
                  <span
                    className={`font-medium ${
                      equipment.condition === 'NON_FONCTIONNEL' ? 'text-amber-400' : 'text-on-surface'
                    }`}
                  >
                    {conditionLabel(equipment.condition)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Mise en service</span>
                  <span className="text-on-surface font-medium">{formatServiceDate(equipment.commissionedAt)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Mise hors service</span>
                  <span className="text-on-surface font-medium">{formatServiceDate(equipment.decommissionedAt)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#262626]">
                  <span className="text-on-surface-variant">Date de création</span>
                  <span className="text-on-surface font-medium">
                    {equipment.createdAt ? new Date(equipment.createdAt).toLocaleDateString('fr-FR') : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-on-surface-variant">Dernière mise à jour</span>
                  <span className="text-on-surface font-medium">
                    {equipment.updatedAt ? new Date(equipment.updatedAt).toLocaleDateString('fr-FR') : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status & SLA Card */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#262626] p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-on-surface">Garantie & Support Système</span>
                <span className="text-xs text-on-surface-variant">
                  Garantie constructeur et contrat de maintenance actif.
                </span>
                <div className="w-full bg-[#262626] h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-primary h-full w-[75%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (8 cols): Tabs & Timeline */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Tab navigation */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#262626] p-5 flex flex-col gap-6 min-h-[500px]">
              <div className="flex border-b border-[#262626] pb-3 gap-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'text-primary border-primary'
                      : 'text-on-surface-variant border-transparent hover:text-on-surface'
                  }`}
                >
                  Vue d'ensemble
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'text-primary border-primary'
                      : 'text-on-surface-variant border-transparent hover:text-on-surface'
                  }`}
                >
                  Historique du cycle de vie
                </button>
              </div>

              {/* Tab Content: Overview */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#121212] p-4 rounded-lg border border-[#262626] flex flex-col gap-1">
                      <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                        Statut Opérationnel
                      </span>
                      <div className="mt-1">{renderStatusBadge(equipment.status)}</div>
                    </div>
                    <div className="bg-[#121212] p-4 rounded-lg border border-[#262626] flex flex-col gap-1">
                      <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                        Catégorie attribuée
                      </span>
                      <span className="text-lg font-bold text-on-surface mt-1">
                        {equipment.category?.name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#121212] p-5 rounded-lg border border-[#262626] flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">description</span>
                      <span>Description de la catégorie</span>
                    </h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {equipment.category?.description ||
                        "Aucune description spécifique renseignée pour cette catégorie d'équipement."}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Content: History Timeline */}
              {activeTab === 'history' && (
                <div className="flex flex-col gap-6">
                  <h4 className="text-sm font-bold text-on-surface">Journal des événements</h4>
                  <div className="relative pl-6 border-l-2 border-[#262626] flex flex-col gap-6">
                    {/* Item 1 */}
                    <div className="relative flex flex-col gap-1">
                      <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-[#1A1A1A]"></span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-on-surface">Enregistrement dans le système</span>
                        <span className="text-on-surface-variant font-mono">
                          {equipment.createdAt ? new Date(equipment.createdAt).toLocaleDateString('fr-FR') : 'Date initiale'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Équipement ajouté au parc avec le numéro de série {equipment.serialNumber}.
                      </p>
                    </div>

                    {/* Item 2 */}
                    <div className="relative flex flex-col gap-1">
                      <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-surface-variant border-4 border-[#1A1A1A]"></span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-on-surface">Statut actuel défini sur {equipment.status}</span>
                        <span className="text-on-surface-variant font-mono">
                          {equipment.updatedAt ? new Date(equipment.updatedAt).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Mise à jour automatique de l'état de l'actif.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal edit */}
        <EquipmentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => fetchEquipmentDetail(equipment.id)}
          equipmentToEdit={equipment}
        />
      </div>
    </AppLayout>
  );
};
