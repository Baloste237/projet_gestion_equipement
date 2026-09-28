import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../ui/ConfirmModal';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleConfirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Utilisateurs', path: '/users', icon: 'group' },
    { label: 'Départements', path: '/departments', icon: 'lan' },
    { label: 'Postes', path: '/positions', icon: 'badge' },
    { label: 'Équipements', path: '/equipments', icon: 'construction' },
    { label: 'Affectations', path: '/assignments', icon: 'assignment_ind' },
    { label: 'Inventaire', path: '/inventories', icon: 'inventory_2' },
    { label: 'Audit', path: '/audit', icon: 'fact_check' },
    { label: 'Paramètres', path: '/settings', icon: 'settings' },
  ];

  return (
    <div className="font-body-md text-body-md antialiased overflow-hidden flex h-screen w-full bg-background text-on-background">
      {/* Sidebar Navigation */}
      <nav className="bg-surface-container-low text-on-surface font-label-md docked left-0 h-screen w-64 hidden md:flex flex-col border-r border-outline-variant p-md gap-base shrink-0 z-40">
        {/* Header Logo & User */}
        <div className="flex items-center gap-sm mb-lg px-base">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center font-bold text-primary shrink-0 shadow-md">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              deployed_code
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-wide truncate">
              EQUIP-CORE
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {user?.role || 'Enterprise System'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-sm px-sm py-sm rounded-lg transition-colors text-body-md font-medium ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="mt-auto pt-sm border-t border-outline-variant flex flex-col gap-2">
          <Link
            to="/settings"
            className="flex items-center gap-sm px-xs py-xs rounded-lg hover:bg-surface-variant transition-colors group cursor-pointer"
            title="Accéder aux paramètres du compte"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-sm shrink-0 group-hover:border-primary">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="font-label-sm text-label-sm text-on-surface font-medium truncate group-hover:text-primary">
                {user?.email || 'utilisateur'}
              </span>
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider truncate">
                {user?.role || 'EMPLOYE'}
              </span>
            </div>
            <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary">chevron_right</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-sm px-sm py-sm text-on-surface-variant hover:bg-error/10 hover:text-error rounded-lg transition-colors w-full text-left cursor-pointer bg-transparent border-none"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        {/* Top Bar */}
        <header className="h-16 border-b border-outline-variant bg-surface-container-low px-lg flex items-center justify-between shrink-0 z-30">
          <div>
            {title && (
              <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-md">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Recherche globale..."
                className="bg-surface-container border border-outline-variant rounded-lg py-1.5 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary w-64"
              />
            </div>
            <button 
              type="button"
              className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
          </div>
        </header>

        {/* Page Body Viewport */}
        <div className="flex-1 overflow-y-auto p-lg">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Déconnexion de la session"
        description="Êtes-vous sûr de vouloir vous déconnecter de la plateforme EQUIP-CORE ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
};
