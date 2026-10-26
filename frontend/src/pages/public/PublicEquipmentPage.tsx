import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicEquipmentService, type PublicAssignee, type PublicEquipmentSheet } from '../../services/api';
import { conditionLabel, formatServiceDate } from '../../utils/equipmentLifecycle';
import { EQUIPMENT_STATUS_LABELS } from '../../utils/equipmentStatus';
import { getImageUrl } from '../../utils/imageUrl';
import type { EquipmentStatus } from '../../services/api';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

// Lu seulement pour savoir s'il faut proposer la fiche complète : cette page n'appelle jamais d'API protégée
const hasSession = () => {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
};

const ASSIGNEE_TYPE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  DEPARTMENT: 'Département',
  POSITION: 'Poste',
};

const assigneeText = (assignee: PublicAssignee): { label: string; muted: boolean } => {
  if (assignee.state === 'UNASSIGNED') return { label: 'Non affecté', muted: true };
  if (assignee.state === 'UNAVAILABLE') return { label: 'Bénéficiaire indisponible pour le moment', muted: true };
  const kind = ASSIGNEE_TYPE_LABELS[assignee.type] ?? '';
  return assignee.name
    ? { label: kind && assignee.type !== 'USER' ? `${assignee.name} (${kind.toLowerCase()})` : assignee.name, muted: false }
    : { label: 'Affecté (nom indisponible)', muted: true };
};

const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4 items-start py-2 border-b border-[#262626] last:border-b-0 text-sm">
    <dt className="text-on-surface-variant shrink-0">{label}</dt>
    <dd className={`text-on-surface font-medium text-right break-words min-w-0 ${mono ? 'font-mono' : ''}`}>
      {value || '—'}
    </dd>
  </div>
);

export const PublicEquipmentPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [sheet, setSheet] = useState<PublicEquipmentSheet | null>(null);
  const connected = hasSession();

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    publicEquipmentService
      .getSheet(id)
      .then((res) => {
        if (cancelled) return;
        setSheet(res.data.data);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = inconnu ou mal formé (même réponse) ; le reste est une panne ou une limitation de débit
        setState(err?.response?.status === 404 ? 'not-found' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const assignee = sheet ? assigneeText(sheet.assignee) : null;
  const statusLabel = sheet ? (EQUIPMENT_STATUS_LABELS[sheet.status as EquipmentStatus] ?? sheet.status) : '';
  const nonFunctional = sheet?.condition === 'NON_FONCTIONNEL';

  return (
    <div className="min-h-screen bg-background text-on-background flex justify-center px-4 py-6">
      <main className="w-full max-w-md flex flex-col gap-4">
        <header className="flex items-center gap-2 text-on-surface-variant text-xs">
          <span className="material-symbols-outlined text-primary text-xl">deployed_code</span>
          <span className="font-bold tracking-wide text-on-surface">EQUIP-CORE</span>
          <span>· Fiche d'équipement</span>
        </header>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2 py-16 text-on-surface-variant" aria-live="polite">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p>Chargement de la fiche...</p>
          </div>
        )}

        {state === 'not-found' && (
          <div role="alert" className="flex flex-col items-center gap-2 text-center py-14 bg-[#1A1A1A] border border-[#262626] rounded-xl px-6">
            <span className="material-symbols-outlined text-5xl text-amber-400">search_off</span>
            <h1 className="text-lg font-semibold text-on-surface">Équipement introuvable</h1>
            <p className="text-sm text-on-surface-variant">
              Ce code ne correspond à aucun équipement. L'étiquette est peut-être ancienne, ou l'équipement a été supprimé.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-2 text-center py-14 bg-[#1A1A1A] border border-[#262626] rounded-xl px-6">
            <span className="material-symbols-outlined text-5xl text-red-400">cloud_off</span>
            <h1 className="text-lg font-semibold text-on-surface">Fiche momentanément indisponible</h1>
            <p className="text-sm text-on-surface-variant">Réessayez dans quelques instants.</p>
          </div>
        )}

        {state === 'ready' && sheet && assignee && (
          <>
            <section className="bg-[#1A1A1A] border border-[#262626] rounded-xl overflow-hidden">
              <div className="h-44 bg-[#0D0D0D] flex items-center justify-center">
                {sheet.imageUrl ? (
                  <img src={getImageUrl(sheet.imageUrl)} alt={sheet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant">devices</span>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2">
                <h1 className="text-xl font-bold text-on-surface break-words">{sheet.name}</h1>
                {sheet.category && <p className="text-sm text-on-surface-variant">{sheet.category}</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary bg-primary/10">
                    {statusLabel}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      nonFunctional
                        ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                        : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    }`}
                  >
                    {conditionLabel(sheet.condition)}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Mis à la disposition de</h2>
              <p className={`text-base font-semibold ${assignee.muted ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                {assignee.label}
              </p>
            </section>

            <section className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Identification</h2>
              <dl>
                <Row label="Numéro de série" value={sheet.serialNumber} mono />
                <Row label="Code-barres" value={sheet.barcode} mono />
                <Row label="Marque" value={sheet.brand} />
                <Row label="Modèle" value={sheet.model} />
                <Row label="Emplacement" value={sheet.location} />
              </dl>
            </section>

            <section className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Service et garantie</h2>
              <dl>
                <Row label="Mise en service" value={formatServiceDate(sheet.commissionedAt)} />
                <Row label="Mise hors service" value={formatServiceDate(sheet.decommissionedAt)} />
                <Row label="Fin de garantie" value={formatServiceDate(sheet.warrantyEndDate)} />
              </dl>
            </section>

            <div className="flex justify-center pt-1">
              {connected ? (
                <Link
                  to={`/equipments/${id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Ouvrir la fiche complète
                </Link>
              ) : (
                <p className="text-sm text-on-surface-variant text-center">
                  Pour voir la fiche complète,{' '}
                  <Link to="/login" className="text-primary font-medium underline">
                    connectez-vous
                  </Link>
                  .
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
