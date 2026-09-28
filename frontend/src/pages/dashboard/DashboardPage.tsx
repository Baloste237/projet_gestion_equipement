import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  userService,
  assignmentService,
  auditLogService,
  dashboardService,
  type User,
  type Assignment,
  type AssigneeType,
  type AuditLog,
  type DashboardKpis,
} from '../../services/api';
import { ChartCard } from '../../components/charts/ChartCard';
import { StackedBarChart, type StackedSegment } from '../../components/charts/StackedBarChart';
import { BarList, type BarListRow } from '../../components/charts/BarList';
import { DonutChart, type DonutSlice } from '../../components/charts/DonutChart';
import { TrendChart } from '../../components/charts/TrendChart';
import { getApiErrorMessage } from '../../utils/apiError';
import { downloadBlob } from '../../utils/download';
import { ASSIGNEE_TYPES, ASSIGNEE_TYPE_ICONS, ASSIGNEE_TYPE_LABELS } from '../../utils/assignee';
import { EQUIPMENT_STATUS_LABELS } from '../../utils/equipmentStatus';
import {
  buildAssignmentTrend,
  bucketSizeDays,
  groupAssignmentsByDepartment,
  percentOf,
} from '../../utils/dashboardStats';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#10b981',
  ASSIGNED: '#3b82f6',
  IN_MAINTENANCE: '#f59e0b',
  RETIRED: '#ef4444',
  A_COMPLETER: '#fb923c',
};
const STATUS_ORDER = ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'A_COMPLETER'] as const;

const ASSIGNEE_COLORS: Record<AssigneeType, string> = {
  USER: '#3b82f6',
  DEPARTMENT: '#a855f7',
  POSITION: '#06b6d4',
};

const PERIOD_LABELS: Record<string, string> = {
  '7': 'les 7 derniers jours',
  '30': 'les 30 derniers jours',
  '90': 'les 3 derniers mois',
  '365': 'les 12 derniers mois',
};

const equipmentUnit = (count: number) => `${count} équipement${count > 1 ? 's' : ''}`;
const assignmentUnit = (count: number) => `${count} affectation${count > 1 ? 's' : ''}`;

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : null;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  // null = liste indisponible (échec) : les diagrammes qui en dépendent l'indiquent au lieu d'afficher des zéros
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('30');
  const [activeTab, setActiveTab] = useState<'categories' | 'departments'>('categories');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setKpiError(null);
    const [kpiRes, usersRes, assignmentsRes, auditRes] = await Promise.allSettled([
      dashboardService.getKpis(),
      userService.getAll(),
      assignmentService.getAll(),
      auditLogService.getAll(),
    ]);

    if (kpiRes.status === 'fulfilled') {
      setKpis(kpiRes.value.data?.data ?? null);
    } else {
      console.error('Erreur chargement KPIs:', kpiRes.reason);
      setKpis(null);
      setKpiError(getApiErrorMessage(kpiRes.reason, 'Impossible de charger les indicateurs du tableau de bord.'));
    }
    setUsers(usersRes.status === 'fulfilled' ? usersRes.value.data?.data || [] : []);
    setAssignments(assignmentsRes.status === 'fulfilled' ? assignmentsRes.value.data?.data || [] : null);
    setAuditLogs(auditRes.status === 'fulfilled' ? auditRes.value.data?.data || [] : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRebuild = async () => {
    setRebuilding(true);
    setRebuildError(null);
    try {
      await dashboardService.rebuildKpis();
      await fetchDashboardData();
    } catch (err) {
      console.error('Erreur reconstruction KPIs:', err);
      setRebuildError(getApiErrorMessage(err, 'La reconstruction des KPIs a échoué.'));
    } finally {
      setRebuilding(false);
    }
  };

  const activeUsers = useMemo(
    () => users.filter((u) => u.isActive !== false && u.status !== 'INACTIF').length,
    [users]
  );

  const total = kpis?.equipments.total ?? 0;
  const statusCount = (status: string) => kpis?.equipments.byStatus[status] ?? 0;

  const statusSegments: StackedSegment[] = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        key: status,
        label: EQUIPMENT_STATUS_LABELS[status],
        value: kpis?.equipments.byStatus[status] ?? 0,
        color: STATUS_COLORS[status],
        hint: 'Cliquez pour ouvrir la liste',
        onSelect: () => navigate(`/equipments?status=${status}`),
      })),
    [kpis, navigate]
  );

  const categoryRows: BarListRow[] = useMemo(
    () =>
      (kpis?.equipments.byCategory ?? []).map((category) => ({
        key: category.categoryId,
        label: category.name || 'Sans catégorie',
        value: category.total,
        highlight: category.available,
        highlightLabel: category.available > 1 ? 'disponibles' : 'disponible',
      })),
    [kpis]
  );

  const assigneeSlices: DonutSlice[] = useMemo(
    () =>
      ASSIGNEE_TYPES.map((type) => ({
        key: type,
        label: ASSIGNEE_TYPE_LABELS[type],
        value: kpis?.assignments.byAssigneeType[type] ?? 0,
        color: ASSIGNEE_COLORS[type],
        icon: ASSIGNEE_TYPE_ICONS[type],
      })),
    [kpis]
  );

  const departmentRows: BarListRow[] = useMemo(
    () => groupAssignmentsByDepartment(assignments ?? []).map((row) => ({ key: row.label, label: row.label, value: row.count })),
    [assignments]
  );

  const periodDays = Number(period);
  const trendBuckets = useMemo(() => buildAssignmentTrend(assignments ?? [], periodDays), [assignments, periodDays]);
  const trendIsEmpty = trendBuckets.every((bucket) => bucket.created === 0 && bucket.returned === 0);

  const assignedPercent = percentOf(statusCount('ASSIGNED'), total);
  const availablePercent = percentOf(statusCount('AVAILABLE'), total);
  const updatedAt = formatDateTime(kpis?.updatedAt ?? null);
  const kpiValue = (value: number | null | undefined) => (kpis && value !== null && value !== undefined ? value.toLocaleString() : '—');

  // Export du rapport : indicateurs et agrégats affichés, au format JSON
  const handleExportData = () => {
    const reportData = {
      exportedAt: new Date().toISOString(),
      kpisUpdatedAt: kpis?.updatedAt ?? null,
      kpis,
      totalUsers: users.length,
      activeUsers,
      period: { days: periodDays, groupedBy: bucketSizeDays(periodDays) === 1 ? 'jour' : 'semaine' },
      assignmentsByDepartment: assignments ? departmentRows.map((row) => ({ department: row.label, assignments: row.value })) : null,
      assignmentTrend: assignments ? trendBuckets : null,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `EQUIP_CORE_Report_${new Date().toISOString().substring(0, 10)}.json`);
  };

  const departmentTotal = departmentRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <AppLayout
      title="Tableau de Bord Analytics & Performance"
      subtitle="Indicateurs et diagrammes pour analyser l'état du parc, ses affectations et leur évolution."
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container border border-outline-variant p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <span className={`material-symbols-outlined text-xl ${loading || rebuilding ? 'animate-spin' : ''}`}>
                {loading || rebuilding ? 'sync' : 'analytics'}
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">Supervision du Parc Informatique</h2>
              <p className="text-xs text-on-surface-variant">
                {updatedAt ? `Indicateurs mis à jour le ${updatedAt}` : 'Indicateurs en attente de synchronisation'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Période de l'évolution des affectations"
              className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="7">Derniers 7 jours</option>
              <option value="30">Derniers 30 jours</option>
              <option value="90">Derniers 3 mois</option>
              <option value="365">12 derniers mois</option>
            </select>

            <button
              type="button"
              onClick={handleRebuild}
              disabled={rebuilding}
              title="Recalcule les compteurs à partir des services équipements et affectations"
              className="px-3.5 py-2 bg-surface-container-high border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-base ${rebuilding ? 'animate-spin' : ''}`}>refresh</span>
              <span>{rebuilding ? 'Reconstruction...' : 'Reconstruire les KPIs'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportData}
              disabled={!kpis}
              className="px-3.5 py-2 bg-surface-container-high border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Exporter Rapport</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/equipments')}
              className="px-3.5 py-2 bg-primary text-on-primary-container hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Ajouter un Équipement</span>
            </button>
          </div>
        </div>

        {kpiError && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{kpiError}</span>
            </div>
            <button onClick={fetchDashboardData} className="px-3 py-1 bg-red-500/20 text-xs font-bold rounded-lg hover:bg-red-500/30 cursor-pointer">
              Réessayer
            </button>
          </div>
        )}

        {kpis && !kpis.synchronized && (
          <div role="alert" className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">warning</span>
              <span>Les indicateurs ne sont pas encore synchronisés : les valeurs affichées peuvent être incomplètes.</span>
            </div>
            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              className="px-3 py-1 bg-amber-500/20 text-xs font-bold rounded-lg hover:bg-amber-500/30 cursor-pointer disabled:opacity-60"
            >
              {rebuilding ? 'Reconstruction...' : 'Reconstruire les KPIs'}
            </button>
          </div>
        )}

        {rebuildError && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{rebuildError}</span>
            </div>
            <button onClick={() => setRebuildError(null)} className="text-xs underline hover:no-underline font-semibold cursor-pointer">
              Fermer
            </button>
          </div>
        )}

        {/* KPI Bento Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Total Équipements"
            icon="devices"
            value={kpiValue(kpis?.equipments.total)}
            subValue="Dans le parc"
            onClick={() => navigate('/equipments')}
            color="border-primary/30 text-primary"
          />
          <KpiCard
            title="Affectés"
            icon="assignment_ind"
            value={kpiValue(kpis && statusCount('ASSIGNED'))}
            subValue={kpis ? `${assignedPercent}% du parc` : ' '}
            onClick={() => navigate('/assignments')}
            color="border-blue-500/30 text-blue-400"
          />
          <KpiCard
            title="Disponibles"
            icon="inventory"
            value={kpiValue(kpis && statusCount('AVAILABLE'))}
            subValue={kpis ? `${availablePercent}% du parc` : ' '}
            onClick={() => navigate('/equipments?status=AVAILABLE')}
            color="border-emerald-500/30 text-emerald-400"
          />
          <KpiCard
            title="En Maintenance"
            icon="build_circle"
            value={kpiValue(kpis && statusCount('IN_MAINTENANCE'))}
            subValue="En réparation"
            onClick={() => navigate('/equipments?status=IN_MAINTENANCE')}
            color="border-amber-500/30 text-amber-400"
          />
          <KpiCard
            title="Utilisateurs Actifs"
            icon="group"
            value={users.length > 0 ? activeUsers.toLocaleString() : '—'}
            subValue={users.length > 0 ? `${users.length} au total` : ' '}
            onClick={() => navigate('/users')}
            color="border-purple-500/30 text-purple-400"
          />
          <KpiCard
            title="Inventaires"
            icon="fact_check"
            value={kpiValue(kpis?.inventories.inProgress)}
            subValue="En cours"
            onClick={() => navigate('/inventories')}
            color="border-cyan-500/30 text-cyan-400"
          />
        </div>

        {/* Analytics & Performance Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <ChartCard
              title="Répartition du Parc par Statut"
              description="Cliquez sur un statut pour ouvrir la liste correspondante"
              badge={kpis ? equipmentUnit(total) : undefined}
              isEmpty={kpis !== null && total === 0}
              emptyMessage="Aucun équipement enregistré : rien à représenter pour le moment."
              errorMessage={kpiError ? 'Indicateurs indisponibles.' : null}
            >
              <StackedBarChart segments={statusSegments} unit={equipmentUnit} ariaLabel="Répartition des équipements par statut" />
            </ChartCard>

            <ChartCard
              title="Analyse par Catégorie & Département"
              description={
                activeTab === 'categories'
                  ? 'Total par catégorie, dont équipements disponibles'
                  : 'Équipements actuellement affectés, par département (les plus dotés en premier)'
              }
              actions={
                <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant w-fit" role="tablist">
                  {(
                    [
                      ['categories', `Catégories (${categoryRows.length})`],
                      ['departments', `Départements (${departmentRows.length})`],
                    ] as const
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeTab === tab ? 'bg-primary text-on-primary-container font-bold shadow' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
              isEmpty={activeTab === 'categories' ? kpis !== null && categoryRows.length === 0 : assignments !== null && departmentRows.length === 0}
              emptyMessage={
                activeTab === 'categories'
                  ? 'Aucune catégorie avec des équipements.'
                  : 'Aucun équipement affecté actuellement.'
              }
              errorMessage={
                activeTab === 'categories'
                  ? kpiError
                    ? 'Indicateurs indisponibles.'
                    : null
                  : assignments === null && !loading
                  ? 'Liste des affectations indisponible.'
                  : null
              }
            >
              {activeTab === 'categories' ? (
                <BarList rows={categoryRows} total={total} unit={equipmentUnit} ariaLabel="Équipements par catégorie" />
              ) : (
                <BarList
                  rows={departmentRows}
                  total={departmentTotal}
                  unit={equipmentUnit}
                  color="#a855f7"
                  ariaLabel="Équipements affectés par département"
                />
              )}
            </ChartCard>

            <ChartCard
              title="Affectations Actives par Type de Bénéficiaire"
              description="Utilisateurs, départements et postes"
              badge={kpis ? assignmentUnit(kpis.assignments.active) : undefined}
              isEmpty={kpis !== null && kpis.assignments.active === 0}
              emptyMessage="Aucune affectation active."
              errorMessage={kpiError ? 'Indicateurs indisponibles.' : null}
            >
              <DonutChart
                slices={assigneeSlices}
                totalLabel="affectations actives"
                unit={assignmentUnit}
                ariaLabel="Affectations actives par type de bénéficiaire"
              />
            </ChartCard>

            <ChartCard
              title="Évolution des Affectations"
              description={`Créations et restitutions sur ${PERIOD_LABELS[period] ?? `${period} jours`}, par ${
                bucketSizeDays(periodDays) === 1 ? 'jour' : 'semaine'
              }`}
              isEmpty={assignments !== null && trendIsEmpty}
              emptyMessage="Aucune affectation ni restitution sur cette période."
              errorMessage={assignments === null && !loading ? 'Liste des affectations indisponible.' : null}
            >
              <TrendChart buckets={trendBuckets} ariaLabel="Évolution des affectations créées et restituées" />
            </ChartCard>
          </div>

          {/* Right Sidebar: Audit Stream & Shortcuts */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">history</span>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Activité Récente (Audit DB)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/audit')}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Voir tout
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-4 text-center">Aucune activité récente enregistrée.</p>
                ) : (
                  auditLogs.slice(0, 6).map((log) => {
                    const statusCode = log.metadata?.statusCode || 200;
                    const actorEmail = log.metadata?.userEmail || log.performedBy || 'Système';
                    const ip = log.metadata?.ipAddress || '127.0.0.1';
                    const timeStr = log.metadata?.timestamp ? new Date(log.metadata.timestamp).toLocaleTimeString('fr-FR') : 'Récemment';

                    return (
                      <div key={log.id} className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-outline">{timeStr}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            statusCode >= 400 ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            HTTP {statusCode}
                          </span>
                        </div>
                        <p className="font-semibold text-xs text-on-surface">{log.action}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{actorEmail} • {ip}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-xl space-y-3">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface mb-2">Raccourcis d'Administration</h3>

              {[
                { path: '/users', icon: 'group', color: 'text-purple-400', label: 'Gérer les Utilisateurs & Rôles' },
                { path: '/departments', icon: 'lan', color: 'text-blue-400', label: 'Gérer les Départements' },
                { path: '/positions', icon: 'badge', color: 'text-cyan-400', label: 'Gérer les Postes' },
                { path: '/inventories', icon: 'inventory_2', color: 'text-emerald-400', label: 'Lancer un Inventaire' },
              ].map((shortcut) => (
                <button
                  key={shortcut.path}
                  type="button"
                  onClick={() => navigate(shortcut.path)}
                  className="w-full p-3 bg-surface-container-lowest border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-lg ${shortcut.color}`}>{shortcut.icon}</span>
                    <span>{shortcut.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

// Interactive KPI Subcomponent
const KpiCard: React.FC<{
  title: string;
  icon: string;
  value: string;
  subValue: string;
  onClick: () => void;
  color: string;
}> = ({ title, icon, value, subValue, onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left bg-surface-container border border-outline-variant hover:border-primary/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl group cursor-pointer"
  >
    <div className="flex items-center justify-between mb-2 w-full">
      <span className="font-label-sm text-xs font-semibold text-on-surface-variant truncate">{title}</span>
      <div className={`w-8 h-8 rounded-lg bg-surface-container-lowest border flex items-center justify-center group-hover:scale-110 transition-transform ${color}`}>
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
    </div>
    <div>
      <span className="font-headline-md text-2xl font-bold text-on-surface tracking-tight block">{value}</span>
      <span className="font-label-sm text-[11px] text-on-surface-variant/80 mt-0.5 block">{subValue}</span>
    </div>
  </button>
);
