import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { equipmentService, type Equipment } from '../../services/api';
import { QrCodeImage } from '../../components/QrCodeImage';
import { getPublicAppUrl } from '../../config/publicUrl';
import { getApiErrorMessage } from '../../utils/apiError';
import { loadLabelIds, pickForLabels } from '../../utils/labelSelection';
import { equipmentQrUrl } from '../../utils/qrCode';

// Page volontairement hors de la mise en page de l'application : à l'impression, seules les étiquettes sortent.
// Les étiquettes restent blanches (noir sur blanc) même sur le thème sombre, pour que le QR se lise.
const LABEL_STYLE: React.CSSProperties = { width: '62mm', height: '38mm', breakInside: 'avoid' };

export const EquipmentLabelsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Identifiants transmis par la navigation, ou conservés pour un rechargement de la page
  const ids = useMemo(() => {
    const fromNavigation = (location.state as { equipmentIds?: string[] } | null)?.equipmentIds;
    return fromNavigation?.length ? fromNavigation : loadLabelIds(sessionStorage);
  }, [location.state]);

  const [equipments, setEquipments] = useState<Equipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    equipmentService
      .getAll()
      .then((res) => {
        if (!cancelled) setEquipments(res.data.data || []);
      })
      .catch((err) => {
        console.error('Erreur de chargement des équipements pour les étiquettes:', err);
        if (!cancelled) setError(getApiErrorMessage(err, 'Impossible de charger les équipements.'));
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const { picked, missing } = useMemo(() => pickForLabels(equipments ?? [], ids), [equipments, ids]);
  const baseUrl = getPublicAppUrl();

  return (
    <div className="min-h-screen bg-background text-on-background print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-on-surface">Étiquettes QR</h1>
          <p className="text-xs text-on-surface-variant">
            {equipments
              ? `${picked.length} étiquette${picked.length > 1 ? 's' : ''}`
              : 'Préparation des étiquettes...'}
            {missing > 0 && ` · ${missing} équipement${missing > 1 ? 's' : ''} introuvable${missing > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 text-sm rounded-lg text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!picked.length}
            className="px-4 py-1.5 bg-primary text-on-primary font-medium rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {!ids.length && (
        <div className="print:hidden max-w-md mx-auto text-center py-16 px-4">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">label_off</span>
          <p className="mt-3 text-on-surface">Aucun équipement à étiqueter.</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Sélectionnez des équipements dans la liste, ou utilisez le bouton d'étiquettes après un import.
          </p>
          <Link to="/equipments" className="inline-block mt-4 text-primary underline text-sm">
            Retour à la liste des équipements
          </Link>
        </div>
      )}

      {error && (
        <div role="alert" className="print:hidden max-w-md mx-auto mt-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {equipments && (
        <div className="flex flex-wrap gap-3 p-4 print:p-0 print:gap-0 justify-center print:justify-start">
          {picked.map((equipment) => (
            <div
              key={equipment.id}
              style={LABEL_STYLE}
              className="bg-white text-black border border-gray-400 rounded-sm flex items-center gap-2 p-2 overflow-hidden"
            >
              <QrCodeImage
                value={equipmentQrUrl(equipment.id, baseUrl)}
                size={112}
                alt={`Code QR de ${equipment.name}`}
              />
              <div className="min-w-0 flex flex-col gap-1">
                <p className="text-[11px] font-bold leading-tight line-clamp-3 break-words">{equipment.name}</p>
                <p className="text-[10px] font-mono leading-tight break-all">{equipment.serialNumber}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
