import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { auditLogService, type AuditCategory, type AuditListParams, type AuditLog, type AuditSummary } from '../../services/api';
import { AuditLogDetailModal } from './AuditLogDetailModal';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { SEARCH_DEBOUNCE_MS } from '../../utils/equipmentList';
import type { PageMeta } from '../../utils/listParams';
import { clampPage, readStoredPageSize, storePageSize } from '../../utils/pagination';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination côté serveur : la liste affichée est la page courante ; les compteurs portent sur tout le journal
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => readStoredPageSize());
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  // Seule la réponse de la dernière requête est affichée
  const latestRequest = useRef(0);

  // Live Stream state
  const [isLiveStream, setIsLiveStream] = useState(true);

  // Filters state : filtres appliqués par le serveur ; la recherche l'est après une courte pause de frappe
  const [searchInput, setSearchInput] = useState('');
  const [searchActor, setSearchActor] = useState('');
  const appliedSearch = useRef('');
  const [actionCategory, setActionCategory] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const params: AuditListParams = {
    page,
    pageSize,
    q: searchActor,
    category: actionCategory === 'ALL' ? undefined : (actionCategory as AuditCategory),
    date: selectedDate,
  };
  // L'actualisation périodique recharge la page et les filtres courants (et non ceux du moment où elle a été programmée)
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  const fetchLogs = async (quiet = false, requested: AuditListParams = paramsRef.current) => {
    const requestId = ++latestRequest.current;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const res = await auditLogService.getAll(requested);
      if (requestId !== latestRequest.current) return;
      const loaded: AuditLog[] = res.data?.data || [];
      const loadedMeta: PageMeta | null = res.data?.meta ?? null;
      setLogs(loaded);
      setMeta(loadedMeta);
      if (res.data?.summary) setSummary(res.data.summary);
      // La page demandée n'existe plus : retour à la dernière page
      if (loaded.length === 0 && loadedMeta && loadedMeta.total > 0 && (requested.page ?? 1) > 1) {
        setPage(clampPage(requested.page ?? 1, loadedMeta.total, requested.pageSize ?? pageSize));
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Erreur chargement logs audit:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsLiveStream(false);
      }
      if (!quiet) setError('Impossible de charger les journaux d\'audit.');
    } finally {
      if (!quiet && requestId === latestRequest.current) setLoading(false);
    }
  };

  // Rechargement à chaque changement de page, de taille ou de filtre
  useEffect(() => {
    fetchLogs(false, { page, pageSize, q: searchActor, category: actionCategory === 'ALL' ? undefined : (actionCategory as AuditCategory), date: selectedDate });
  }, [page, pageSize, searchActor, actionCategory, selectedDate]);

  // La recherche est envoyée après une pause de frappe, et ramène à la première page
  useEffect(() => {
    const next = searchInput.trim();
    const timer = setTimeout(() => {
      if (next === appliedSearch.current) return;
      appliedSearch.current = next;
      setSearchActor(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Live stream auto refresh every 5 seconds if active, sur la page et les filtres courants
  useEffect(() => {
    if (!isLiveStream) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLiveStream]);

  const changePageSize = (size: number) => {
    storePageSize(size);
    setPageSize(size);
    setPage(1);
  };

  // Compteurs de tout le journal (sans tenir compte des filtres), calculés par le serveur
  const stats = {
    total: summary?.total ?? 0,
    authCount: summary?.authCount ?? 0,
    mutationCount: summary?.mutationCount ?? 0,
    successRate: summary && summary.total > 0 ? Math.round(((summary.total - summary.failedCount) / summary.total) * 100) : 100,
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Exporte tout le journal correspondant aux filtres, et non seulement la page affichée (appel sans page)
  const exportReport = async () => {
    try {
      const res = await auditLogService.getAll({ q: searchActor, category: params.category, date: selectedDate });
      const all: AuditLog[] = res.data?.data || [];
      if (all.length === 0) {
        alert('Aucun log à exporter.');
        return;
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(all, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `audit-report-${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Erreur export audit:', err);
      alert("L'export a échoué : aucun fichier n'a été téléchargé.");
    }
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('DELETE') || action.includes('FAILED')) {
      return 'bg-red-500/10 border border-red-500/30 text-red-400';
    }
    if (action.includes('CREATE') || action.includes('INITIALIZATION')) {
      return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
    }
    if (action.includes('UPDATE') || action.includes('TRANSFER')) {
      return 'bg-blue-500/10 border border-blue-500/30 text-blue-400';
    }
    return 'bg-surface-variant border border-outline-variant text-on-surface-variant';
  };

  return (
    <AppLayout
      title="Audit & Monitoring Temps Réel"
      subtitle="Registre immuable des activités système, connexions et mutations de données."
    >
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-md text-label-md text-primary tracking-widest uppercase opacity-80">
                System Administration & Compliance
              </span>
              {isLiveStream && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  TEMPS RÉEL
                </span>
              )}
            </div>
            <h2 className="font-display-lg text-display-lg font-bold text-on-surface">
              Journaux d'Audit & Logs
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLiveStream(!isLiveStream)}
              className={`px-3 py-2 rounded-lg text-body-sm font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                isLiveStream
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isLiveStream ? 'sensors' : 'sensors_off'}
              </span>
              {isLiveStream ? 'Flux Temps Réel (Actif)' : 'Flux Pausé'}
            </button>

            <Button
              variant="outline"
              onClick={exportReport}
              icon={<span className="material-symbols-outlined text-base">download</span>}
            >
              Export Report
            </Button>
          </div>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Events */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Total Événements</h3>
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold mb-1">
              {stats.total}
            </p>
            <span className="text-xs text-on-surface-variant">Traçabilité système immuable</span>
          </div>

          {/* Card 2: Auth Events */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Connexions & Auth</h3>
              <span className="material-symbols-outlined text-blue-400">security</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-blue-400 font-bold mb-1">
              {stats.authCount}
            </p>
            <span className="text-xs text-on-surface-variant">Événements d'authentification</span>
          </div>

          {/* Card 3: Mutations */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Mutations de Données</h3>
              <span className="material-symbols-outlined text-emerald-400">edit_note</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-emerald-400 font-bold mb-1">
              {stats.mutationCount}
            </p>
            <span className="text-xs text-on-surface-variant">Créations, modifications & suppressions</span>
          </div>

          {/* Card 4: Success Rate */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Taux de Succès</h3>
              <span className="material-symbols-outlined text-emerald-400">verified</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold mb-1">
              {stats.successRate}%
            </p>
            <span className="text-xs text-emerald-400">Fonctionnement optimal des services</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Actor */}
            <div className="relative flex-1 md:w-64 min-w-[180px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Acteur, ID log, utilisateur..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#333333] rounded-lg py-2 pl-9 pr-3 text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* Category Filter */}
            <select
              value={actionCategory}
              onChange={(e) => {
                setActionCategory(e.target.value);
                setPage(1);
              }}
              className="bg-[#0D0D0D] border border-[#333333] rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Toutes les Actions</option>
              <option value="AUTHENTICATION">AUTHENTICATION & CONNEXION</option>
              <option value="DATA_MUTATION">MUTATIONS DE DONNÉES</option>
              <option value="SYSTEM_EVENT">ÉVÉNEMENTS SYSTÈME</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="bg-[#0D0D0D] border border-[#333333] rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {meta?.total ?? logs.length} événement{(meta?.total ?? logs.length) > 1 ? 's' : ''} correspondant{(meta?.total ?? logs.length) > 1 ? 's' : ''}
          </span>
        </div>

        {/* Data Table */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
              <p>Chargement des journaux d'audit en temps réel...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl">error</span>
              <p>{error}</p>
              <Button variant="outline" className="mt-2" onClick={() => fetchLogs()}>
                Réessayer
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl opacity-50">receipt_long</span>
              <p className="font-headline-sm text-headline-sm text-on-surface">Aucun journal d'audit ne correspond à vos filtres</p>
              <p className="text-body-sm">Modifiez vos critères de recherche pour consulter les activités système.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#131313] border-b border-[#333333]">
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wider">
                      HORODATAGE
                    </th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wider">
                      HTTP
                    </th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wider">
                      ACTEUR / EMAIL
                    </th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wider">
                      ACTION
                    </th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wider">
                      RESSOURCE
                    </th>
                    <th className="p-4 font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wider text-right">
                      STATUT
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-[#262626]">
                  {logs.map((log) => {
                    const httpCode = log.metadata?.httpStatus || (log.action.includes('FAILED') ? 401 : 200);
                    const isSuccessCode = httpCode >= 200 && httpCode < 300;
                    const isFailed =
                      !isSuccessCode ||
                      log.action.includes('FAILED') ||
                      log.metadata?.status === 'FAILED' ||
                      log.metadata?.success === false;

                    const displayActor =
                      log.metadata?.email ||
                      log.performedBy ||
                      'Système';

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-[#20201f] transition-colors cursor-pointer"
                      >
                        <td className="p-4 text-on-surface-variant font-mono text-xs">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                            isSuccessCode
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            HTTP {httpCode}
                          </span>
                        </td>
                        <td className="p-4 text-on-surface font-medium text-xs">
                          {displayActor}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-on-surface-variant font-mono text-xs">
                          {log.entityType}/{log.entityId}
                        </td>
                        <td className="p-4 text-right">
                          {isFailed ? (
                            <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-xs">
                              <span className="material-symbols-outlined text-sm">error</span> FAILED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                              <span className="material-symbols-outlined text-sm">check_circle</span> SUCCESS
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={meta?.total ?? 0}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          )}
        </div>
      </div>

      {/* Log Detail Inspector Modal */}
      <AuditLogDetailModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </AppLayout>
  );
};
