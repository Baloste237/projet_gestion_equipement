import React, { useEffect, useMemo, useRef, useState } from 'react';
import { equipmentService, type ImportPreview, type ImportResult } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { getApiErrorDetails, getApiErrorMessage } from '../../utils/apiError';
import {
  IMPORT_FIELD_LABELS,
  MAX_IMPORT_FILE_BYTES,
  fieldLabel,
  findDuplicateFields,
  hasNameSource,
  initialMapping,
  parseImportErrors,
  toMappingPayload,
  validateImportFile,
  type ColumnMapping,
  type ImportRowError,
} from '../../utils/importMapping';

interface ImportEquipmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé après un import réussi pour rafraîchir la liste */
  onImported: () => void;
}

type Step = 'file' | 'mapping' | 'result';

const STEP_LABELS: Record<Step, string> = { file: 'Fichier', mapping: 'Colonnes', result: 'Résultat' };
const STEPS: Step[] = ['file', 'mapping', 'result'];

const cellText = (value: string | number | boolean | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

export const ImportEquipmentsModal: React.FC<ImportEquipmentsModalProps> = ({ isOpen, onClose, onImported }) => {
  const [step, setStep] = useState<Step>('file');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('file');
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    setRowErrors([]);
    setFailureMessage(null);
    setFileError(null);
    setBusy(false);
    setDragging(false);
  }, [isOpen]);

  const duplicates = useMemo(() => findDuplicateFields(mapping), [mapping]);
  const nameMissing = useMemo(() => !hasNameSource(mapping), [mapping]);

  if (!isOpen) return null;

  const analyse = async (candidate: File) => {
    const problem = validateImportFile(candidate);
    if (problem) {
      setFile(null);
      setFileError(problem);
      return;
    }
    setFile(candidate);
    setFileError(null);
    setBusy(true);
    try {
      const res = await equipmentService.previewImport(candidate);
      const data: ImportPreview = res.data.data;
      setPreview(data);
      setMapping(initialMapping(data.headers, data.suggestedMapping));
      setStep('mapping');
    } catch (err) {
      console.error("Erreur d'analyse du fichier d'import:", err);
      setFile(null);
      setFileError(getApiErrorMessage(err, "Impossible d'analyser ce fichier."));
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const candidate = files?.[0];
    if (candidate) analyse(candidate);
  };

  const runImport = async () => {
    if (!file) return;
    setBusy(true);
    setFailureMessage(null);
    setRowErrors([]);
    try {
      const res = await equipmentService.importFile(file, toMappingPayload(mapping));
      setResult(res.data.data);
      setStep('result');
      onImported();
    } catch (err) {
      console.error("Erreur lors de l'import:", err);
      setResult(null);
      setFailureMessage(getApiErrorMessage(err, "L'import a échoué."));
      setRowErrors(parseImportErrors(getApiErrorDetails(err)));
      setStep('result');
    } finally {
      setBusy(false);
    }
  };

  const backToFile = () => {
    setStep('file');
    setFile(null);
    setPreview(null);
    setFileError(null);
  };

  const blocked = Object.keys(duplicates).length > 0;
  const stepIndex = STEPS.indexOf(step);
  const selectClass =
    'w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-1.5 px-2 text-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importTitle"
        className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div>
              <h2 id="importTitle" className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Importer des équipements
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Fichier CSV ou Excel (.xlsx), 5 Mo maximum
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <ol className="flex items-center gap-2 mb-5 text-xs" aria-label="Étapes de l'import">
          {STEPS.map((s, index) => (
            <li
              key={s}
              aria-current={s === step ? 'step' : undefined}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                s === step
                  ? 'border-primary text-primary bg-primary/10 font-semibold'
                  : index < stepIndex
                  ? 'border-emerald-500/40 text-emerald-400'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              <span>{index + 1}.</span>
              <span>{STEP_LABELS[s]}</span>
            </li>
          ))}
        </ol>

        {/* Étape 1 : choix du fichier */}
        {step === 'file' && (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              {busy ? (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
                  <p>Analyse de {file?.name}...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">cloud_upload</span>
                  <p className="text-on-surface">Glissez votre fichier ici</p>
                  <p className="text-xs text-on-surface-variant">
                    La première ligne doit contenir les en-têtes de colonnes. Une colonne « Quantité » de N crée N
                    équipements.
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="sr-only"
                    aria-label="Choisir un fichier à importer"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    Choisir un fichier
                  </Button>
                </div>
              )}
            </div>
            {fileError && (
              <div role="alert" className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{fileError}</span>
              </div>
            )}
            <p className="text-xs text-on-surface-variant mt-3">
              Taille maximale : {MAX_IMPORT_FILE_BYTES / (1024 * 1024)} Mo. Sans numéro de série ou sans catégorie, un
              équipement est créé avec le statut « À compléter ». L'import est tout ou rien : une seule ligne invalide
              annule l'ensemble.
            </p>
          </div>
        )}

        {/* Étape 2 : association des colonnes */}
        {step === 'mapping' && preview && (
          <div>
            <p className="text-body-sm text-on-surface-variant mb-3">
              <strong className="text-on-surface">{file?.name}</strong> : {preview.rowCount} ligne
              {preview.rowCount > 1 ? 's' : ''} de données. Vérifiez à quel champ correspond chaque colonne.
            </p>

            {nameMissing && (
              <div role="alert" className="mb-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>Aucune colonne « Nom » (ni marque ou modèle) : les lignes seront refusées.</span>
              </div>
            )}
            {blocked && (
              <div role="alert" className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>Un même champ ne peut être associé qu'à une seule colonne.</span>
              </div>
            )}

            <div className="overflow-x-auto border border-outline-variant rounded-lg">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="bg-surface-container-lowest text-on-surface-variant uppercase tracking-wider text-xs">
                    <th className="py-2 px-3 font-medium">Colonne du fichier</th>
                    <th className="py-2 px-3 font-medium">Exemples</th>
                    <th className="py-2 px-3 font-medium w-56">Champ de l'équipement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {preview.headers.map((header, index) => {
                    const recognized = Boolean(preview.suggestedMapping[header]);
                    const samples = preview.sampleRows.slice(0, 3).map((row) => cellText(row.values[header]));
                    const selectId = `mapping-${index}`;
                    return (
                      <tr key={header}>
                        <td className="py-2 px-3 font-medium text-on-surface">
                          <label htmlFor={selectId}>{header}</label>
                        </td>
                        <td className="py-2 px-3 text-on-surface-variant text-xs max-w-[16rem] truncate" title={samples.join(' | ')}>
                          {samples.join(' | ')}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            id={selectId}
                            value={mapping[header] ?? ''}
                            onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                            className={`${selectClass} ${duplicates[header] ? 'border-red-500' : ''}`}
                            aria-invalid={Boolean(duplicates[header])}
                          >
                            {/* Une colonne reconnue automatiquement par le serveur ne peut pas être ignorée */}
                            {!recognized && <option value="">— Ne pas importer —</option>}
                            {preview.fields.map((field) => (
                              <option key={field} value={field}>
                                {fieldLabel(field)}
                              </option>
                            ))}
                          </select>
                          {duplicates[header] && (
                            <p className="text-xs text-red-400 mt-1">
                              « {fieldLabel(mapping[header])} » est déjà associé à « {duplicates[header]} ».
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              Les colonnes reconnues automatiquement peuvent être associées à un autre champ, mais pas ignorées.
              Champs disponibles : {Object.values(IMPORT_FIELD_LABELS).join(', ')}.
            </p>

            <div className="flex justify-between gap-3 mt-5 pt-4 border-t border-outline-variant">
              <Button type="button" variant="outline" onClick={backToFile} disabled={busy}>
                Changer de fichier
              </Button>
              <Button type="button" onClick={runImport} disabled={busy || blocked}>
                {busy ? 'Import en cours...' : `Importer ${preview.rowCount} ligne${preview.rowCount > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 : résultat */}
        {step === 'result' && (
          <div>
            {result ? (
              <div role="status" className="flex flex-col items-center text-center gap-2 py-4">
                <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
                <p className="text-headline-sm font-semibold text-on-surface">
                  {result.createdCount} équipement{result.createdCount > 1 ? 's' : ''} créé
                  {result.createdCount > 1 ? 's' : ''}
                </p>
                {result.toCompleteCount > 0 ? (
                  <p className="text-body-sm text-amber-400">
                    dont {result.toCompleteCount} à compléter (numéro de série ou catégorie manquant). Filtrez la liste
                    sur le statut « À compléter » pour les retrouver.
                  </p>
                ) : (
                  <p className="text-body-sm text-on-surface-variant">Tous les équipements sont complets.</p>
                )}
              </div>
            ) : (
              <div>
                <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>
                    {failureMessage} Aucun équipement n'a été créé.
                  </span>
                </div>
                {rowErrors.length > 0 && (
                  <div className="border border-outline-variant rounded-lg overflow-hidden">
                    <table className="w-full text-left text-body-sm">
                      <thead>
                        <tr className="bg-surface-container-lowest text-on-surface-variant uppercase tracking-wider text-xs">
                          <th className="py-2 px-3 font-medium w-24">Ligne</th>
                          <th className="py-2 px-3 font-medium">Problème</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30 max-h-72">
                        {rowErrors.map((error, index) => (
                          <tr key={`${error.row}-${index}`}>
                            <td className="py-1.5 px-3 font-mono text-on-surface-variant">{error.row > 0 ? error.row : '—'}</td>
                            <td className="py-1.5 px-3 text-on-surface">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-outline-variant">
              {result ? (
                <Button type="button" onClick={onClose}>
                  Terminer
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Fermer
                  </Button>
                  <Button type="button" onClick={backToFile}>
                    Corriger le fichier
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
