import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  equipmentService,
  userService,
  departmentService,
  assignmentService,
  inventoryService,
  auditLogService,
  type Equipment,
  type User,
  type Department,
  type Assignment,
  type Inventory,
  type AuditLog,
} from '../../services/api';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('30');
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'departments' | 'assignments'>('overview');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eqRes, usrRes, deptRes, asgnRes, invRes, auditRes] = await Promise.all([
        equipmentService.getAll().catch(() => ({ data: { data: [] } })),
        userService.getAll().catch(() => ({ data: { data: [] } })),
        departmentService.getAll().catch(() => ({ data: { data: [] } })),
        assignmentService.getAll().catch(() => ({ data: { data: [] } })),
        inventoryService.getAll().catch(() => ({ data: { data: [] } })),
        auditLogService.getAll().catch(() => ({ data: { data: [] } })),
      ]);

      setEquipments(eqRes.data?.data || []);
      setUsers(usrRes.data?.data || []);
      setDepartments(deptRes.data?.data || []);
      setAssignments(asgnRes.data?.data || []);
      setInventories(invRes.data?.data || []);
      setAuditLogs(auditRes.data?.data || []);
    } catch (err: any) {
      console.error('Erreur chargement données tableau de bord:', err);
      setError('Impossible de charger les données du tableau de bord depuis les microservices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute Dynamic DB Metrics
  const metrics = useMemo(() => {
    const totalEq = equipments.length;
    const assignedEq = equipments.filter((e) => e.status === 'ASSIGNED').length;
    const availableEq = equipments.filter((e) => e.status === 'AVAILABLE').length;
    const maintenanceEq = equipments.filter((e) => e.status === 'IN_MAINTENANCE').length;
    const retiredEq = equipments.filter((e) => e.status === 'RETIRED').length;
    const activeUsrs = users.filter((u) => u.isActive !== false && u.status !== 'INACTIF').length;
    const activeInvs = inventories.filter((i) => i.status === 'IN_PROGRESS').length;
    const activeAsgns = assignments.filter((a) => a.status === 'ACTIVE').length;

    const assignedPercent = totalEq > 0 ? Math.round((assignedEq / totalEq) * 100) : 0;
    const availablePercent = totalEq > 0 ? Math.round((availableEq / totalEq) * 100) : 0;

    return {
      totalEq,
      assignedEq,
      availableEq,
      maintenanceEq,
      retiredEq,
      activeUsrs,
      activeInvs,
      activeAsgns,
      assignedPercent,
      availablePercent,
    };
  }, [equipments, users, inventories, assignments]);

  // Compute Category Distribution
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; available: number }> = {};
    equipments.forEach((eq) => {
      const catName = eq.category?.name || 'Autres';
      if (!map[catName]) {
        map[catName] = { name: catName, count: 0, available: 0 };
      }
      map[catName].count += 1;
      if (eq.status === 'AVAILABLE') map[catName].available += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [equipments]);

  // Export Dashboard JSON Summary
  const handleExportData = () => {
    const reportData = {
      exportedAt: new Date().toISOString(),
      metrics,
      categoryStats,
      totalUsers: users.length,
      totalDepartments: departments.length,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EQUIP_CORE_Report_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout
      title="Tableau de Bord Analytics & Performance"
      subtitle="Vue d'ensemble en temps réel synchronisée avec la base de données PostgreSQL."
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container border border-outline-variant p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'sync' : 'analytics'}
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">Supervision du Parc Informatique</h2>
              <p className="text-xs text-on-surface-variant">Données en direct agrégées des 6 microservices</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="7">Derniers 7 jours</option>
              <option value="30">Derniers 30 jours</option>
              <option value="90">Derniers 3 mois</option>
              <option value="365">12 derniers mois</option>
            </select>

            <button
              type="button"
              onClick={handleExportData}
              className="px-3.5 py-2 bg-surface-container-high border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{error}</span>
            </div>
            <button onClick={fetchDashboardData} className="px-3 py-1 bg-red-500/20 text-xs font-bold rounded-lg hover:bg-red-500/30">
              Réessayer
            </button>
          </div>
        )}

        {/* Dynamic DB KPI Bento Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Total Équipements"
            icon="devices"
            value={metrics.totalEq.toLocaleString()}
            subValue="Actifs DB"
            onClick={() => navigate('/equipments')}
            color="border-primary/30 text-primary"
          />
          <KpiCard
            title="Affectés"
            icon="assignment_ind"
            value={metrics.assignedEq.toLocaleString()}
            subValue={`${metrics.assignedPercent}% du parc`}
            onClick={() => navigate('/assignments')}
            color="border-blue-500/30 text-blue-400"
          />
          <KpiCard
            title="Disponibles"
            icon="inventory"
            value={metrics.availableEq.toLocaleString()}
            subValue={`${metrics.availablePercent}% du parc`}
            onClick={() => navigate('/equipments')}
            color="border-emerald-500/30 text-emerald-400"
          />
          <KpiCard
            title="En Maintenance"
            icon="build_circle"
            value={metrics.maintenanceEq.toLocaleString()}
            subValue="En réparation"
            onClick={() => navigate('/equipments')}
            color="border-amber-500/30 text-amber-400"
          />
          <KpiCard
            title="Utilisateurs Actifs"
            icon="group"
            value={metrics.activeUsrs.toLocaleString()}
            subValue={`${users.length} au total`}
            onClick={() => navigate('/users')}
            color="border-purple-500/30 text-purple-400"
          />
          <KpiCard
            title="Inventaires"
            icon="fact_check"
            value={metrics.activeInvs.toLocaleString()}
            subValue="En cours"
            onClick={() => navigate('/inventories')}
            color="border-cyan-500/30 text-cyan-400"
          />
        </div>

        {/* Analytics & Performance Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Interactive Charts & Tables */}
          <div className="lg:col-span-8 space-y-6">
            {/* Real DB Status Distribution Progress Bar */}
            <section className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant">
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Répartition du Parc par Statut</h3>
                  <p className="text-xs text-on-surface-variant">Données en direct calculées depuis PostgreSQL</p>
                </div>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/30">
                  {metrics.totalEq} Équipements
                </span>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="h-4 w-full bg-surface-container-lowest rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-outline-variant mb-6">
                <div
                  style={{ width: `${(metrics.availableEq / (metrics.totalEq || 1)) * 100}%` }}
                  className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                  title={`Disponibles: ${metrics.availableEq}`}
                />
                <div
                  style={{ width: `${(metrics.assignedEq / (metrics.totalEq || 1)) * 100}%` }}
                  className="bg-blue-500 h-full transition-all duration-500"
                  title={`Affectés: ${metrics.assignedEq}`}
                />
                <div
                  style={{ width: `${(metrics.maintenanceEq / (metrics.totalEq || 1)) * 100}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`En Maintenance: ${metrics.maintenanceEq}`}
                />
                <div
                  style={{ width: `${(metrics.retiredEq / (metrics.totalEq || 1)) * 100}%` }}
                  className="bg-red-500 h-full rounded-r-full transition-all duration-500"
                  title={`Hors service: ${metrics.retiredEq}`}
                />
              </div>

              {/* Status Breakdown Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-on-surface-variant font-medium">Disponibles</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 font-mono">{metrics.availableEq}</span>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-xs text-on-surface-variant font-medium">Assignés</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400 font-mono">{metrics.assignedEq}</span>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs text-on-surface-variant font-medium">Maintenance</span>
                  </div>
                  <span className="text-lg font-bold text-amber-400 font-mono">{metrics.maintenanceEq}</span>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="text-xs text-on-surface-variant font-medium">Hors Service</span>
                  </div>
                  <span className="text-lg font-bold text-red-400 font-mono">{metrics.retiredEq}</span>
                </div>
              </div>
            </section>

            {/* Categories & Department Ranking Tabs */}
            <section className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Analyse par Catégorie & Département</h3>
                <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'overview' ? 'bg-primary text-on-primary-container font-bold shadow' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Catégories ({categoryStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('departments')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'departments' ? 'bg-primary text-on-primary-container font-bold shadow' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Départements ({departments.length})
                  </button>
                </div>
              </div>

              {activeTab === 'overview' ? (
                <div className="space-y-3">
                  {categoryStats.length === 0 ? (
                    <p className="text-xs text-on-surface-variant py-4 text-center">Aucune catégorie enregistrée.</p>
                  ) : (
                    categoryStats.map((cat) => {
                      const percent = metrics.totalEq > 0 ? Math.round((cat.count / metrics.totalEq) * 100) : 0;
                      return (
                        <div key={cat.name} className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-on-surface">{cat.name}</span>
                            <span className="font-mono text-primary font-bold">{cat.count} équipement{cat.count > 1 ? 's' : ''} ({percent}%)</span>
                          </div>
                          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                            <div style={{ width: `${percent}%` }} className="h-full bg-primary rounded-full transition-all duration-300"></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const memberCount = dept.usersCount ?? (dept.users?.length || 0);
                    return (
                      <div key={dept.id} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-xl">lan</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-bold text-sm text-on-surface truncate">{dept.name}</h4>
                          <span className="text-xs text-on-surface-variant font-mono">{memberCount} membre{memberCount > 1 ? 's' : ''} rattaché{memberCount > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar: Real-time Audit Stream & Active Users */}
          <div className="lg:col-span-4 space-y-6">
            {/* Real Audit Activity Timeline */}
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

            {/* Quick Action Short-cuts */}
            <section className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-xl space-y-3">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface mb-2">Raccourcis d'Administration</h3>
              
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="w-full p-3 bg-surface-container-lowest border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-purple-400 text-lg">group</span>
                  <span>Gérer les Utilisateurs & Rôles</span>
                </div>
                <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/departments')}
                className="w-full p-3 bg-surface-container-lowest border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-blue-400 text-lg">lan</span>
                  <span>Gérer les Départements</span>
                </div>
                <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/inventories')}
                className="w-full p-3 bg-surface-container-lowest border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-cyan-400 text-lg">inventory_2</span>
                  <span>Lancer un Inventaire</span>
                </div>
                <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
              </button>
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
  <div
    onClick={onClick}
    className="bg-surface-container border border-outline-variant hover:border-primary/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl group cursor-pointer"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="font-label-sm text-xs font-semibold text-on-surface-variant truncate">{title}</span>
      <div className={`w-8 h-8 rounded-lg bg-surface-container-lowest border flex items-center justify-center group-hover:scale-110 transition-transform ${color}`}>
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
    </div>
    <div>
      <span className="font-headline-md text-2xl font-bold text-on-surface tracking-tight block">{value}</span>
      <span className="font-label-sm text-[11px] text-on-surface-variant/80 mt-0.5 block">{subValue}</span>
    </div>
  </div>
);
