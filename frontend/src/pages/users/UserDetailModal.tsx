import React from 'react';
import { type User, type Department } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { getCountryByCode } from '../../data/countries';
import { getImageUrl } from '../../utils/imageUrl';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  departments: Department[];
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  departments,
}) => {
  if (!isOpen || !user) return null;

  const department = departments.find((d) => d.id === user.departmentId) || user.department;
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
  const isActive = user.isActive !== undefined ? user.isActive : (user.status !== 'INACTIF');
  const country = getCountryByCode(user.countryCode);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'RESPONSABLE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'AUDITEUR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header with Read-only badge */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Fiche Utilisateur
                </h2>
                <span className="bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded text-xs font-mono uppercase">
                  Lecture seule
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Consultation détaillée des informations du compte.
              </p>
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

        {/* Profile Card Header */}
        <div className="flex flex-col items-center justify-center text-center p-4 bg-surface-container-lowest border border-outline-variant rounded-xl mb-6">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full border-2 border-primary/40 bg-surface-container flex items-center justify-center overflow-hidden text-primary font-bold text-3xl shadow-md">
              {user.avatarUrl ? (
                <img src={getImageUrl(user.avatarUrl)} alt={fullName} className="w-full h-full object-cover rounded-full" />
              ) : (
                fullName.charAt(0).toUpperCase()
              )}
            </div>
            {/* Status indicator dot */}
            <span 
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-surface-container-high ${
                isActive ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              title={isActive ? 'Statut: ACTIF' : 'Statut: INACTIF'}
            />
          </div>

          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
            {fullName}
          </h3>

          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
              {user.role}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
              isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {isActive ? '● ACTIF' : '○ INACTIF'}
            </span>
          </div>
        </div>

        {/* Information Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-container border border-outline-variant/60 rounded-lg p-3">
              <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Adresse Email
              </span>
              <span className="font-body-md text-body-md text-on-surface font-medium flex items-center gap-1.5 break-all">
                <span className="material-symbols-outlined text-sm text-primary">mail</span>
                {user.email}
              </span>
            </div>

            <div className="bg-surface-container border border-outline-variant/60 rounded-lg p-3">
              <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Numéro de Téléphone
              </span>
              <span className="font-body-md text-body-md text-on-surface font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">call</span>
                {user.phone ? (
                  <span>
                    {country ? `${country.flag} ${country.dialCode} ` : ''}
                    {user.phone}
                  </span>
                ) : (
                  'Non renseigné'
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-container border border-outline-variant/60 rounded-lg p-3">
              <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Département
              </span>
              <span className="font-body-md text-body-md text-on-surface font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">lan</span>
                {department?.name || 'Non assigné'}
              </span>
            </div>

            <div className="bg-surface-container border border-outline-variant/60 rounded-lg p-3">
              <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Statut du compte
              </span>
              <span className={`font-body-md text-body-md font-medium flex items-center gap-1.5 ${
                isActive ? 'text-emerald-400' : 'text-red-400'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {isActive ? 'check_circle' : 'cancel'}
                </span>
                {isActive ? 'Compte Actif' : 'Compte Inactif / Désactivé'}
              </span>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant/60 rounded-lg p-3">
            <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
              Identifiant Système (ID)
            </span>
            <span className="font-mono text-xs text-on-surface-variant break-all">
              {user.id}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-outline-variant">
          <Button type="button" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
