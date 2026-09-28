import React from 'react';
import { type AuditLog } from '../../services/api';
import { Button } from '../../components/ui/Button';

interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  isOpen,
  onClose,
  log,
}) => {
  if (!isOpen || !log) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-2xl shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Détail du Log #{log.id.substring(0, 8)}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Enregistrement d'audit immuable du système
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

        {/* Content */}
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/60">
              <span className="text-xs text-on-surface-variant uppercase block mb-1">Horodatage</span>
              <span className="font-mono text-sm text-on-surface font-semibold">{formatDate(log.createdAt)}</span>
            </div>

            <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/60">
              <span className="text-xs text-on-surface-variant uppercase block mb-1">Service Émetteur</span>
              <span className="font-mono text-sm text-primary font-semibold">{log.serviceName}</span>
            </div>

            <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/60">
              <span className="text-xs text-on-surface-variant uppercase block mb-1">Acteur / Utilisateur</span>
              <span className="text-sm text-on-surface font-semibold">{log.performedBy || 'Système'}</span>
            </div>

            <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/60">
              <span className="text-xs text-on-surface-variant uppercase block mb-1">Type d'Action</span>
              <span className="inline-block bg-primary/10 border border-primary/30 text-primary px-2 py-0.5 rounded text-xs font-semibold">
                {log.action}
              </span>
            </div>
          </div>

          <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/60">
            <span className="text-xs text-on-surface-variant uppercase block mb-1">Ressource / Cible</span>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant">
                {log.entityType}
              </span>
              <span className="font-mono text-xs text-on-surface">{log.entityId}</span>
            </div>
          </div>

          {/* JSON Metadata Viewer */}
          <div>
            <span className="text-xs text-on-surface-variant uppercase block mb-1 font-semibold">
              Métadonnées & Payload (JSON)
            </span>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-60">
              <pre>{log.metadata ? JSON.stringify(log.metadata, null, 2) : '{}'}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-outline-variant">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
