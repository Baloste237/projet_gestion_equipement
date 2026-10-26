import React, { useState, useEffect } from 'react';
import { categoryService, type CategoryImportResult } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { getApiErrorDetails } from '../../utils/apiError';
import { categoryErrorMessage } from '../../utils/categoryErrors';
import { IMPORT_EXTENSIONS, parseImportErrors, validateImportFile } from '../../utils/importMapping';

interface ImportCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé après un import réussi pour actualiser la liste */
  onImported: () => void;
}

export const ImportCategoriesModal: React.FC<ImportCategoriesModalProps> = ({ isOpen, onClose, onImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<{ row: number; message: string }[]>([]);
  const [result, setResult] = useState<CategoryImportResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setError(null);
      setRowErrors([]);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setRowErrors([]);
    if (selected) {
      const problem = validateImportFile(selected);
      if (problem) {
        setFile(null);
        setError(problem);
        return;
      }
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setRowErrors([]);
    try {
      const res = await categoryService.importFile(file);
      setResult(res.data.data);
      onImported();
    } catch (err) {
      console.error('Erreur import catégories:', err);
      setError(categoryErrorMessage(err, "Impossible d'importer le fichier."));
      setRowErrors(parseImportErrors(getApiErrorDetails(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Importer des catégories</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Fichier CSV ou Excel (.xlsx)</p>
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

        {result ? (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Import terminé : {result.rowCount} ligne{result.rowCount > 1 ? 's' : ''} lue{result.rowCount > 1 ? 's' : ''}.</span>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                <dd className="text-headline-sm font-semibold text-on-surface">{result.createdCount}</dd>
                <dt className="text-body-sm text-on-surface-variant">créée{result.createdCount > 1 ? 's' : ''}</dt>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                <dd className="text-headline-sm font-semibold text-on-surface">{result.existingCount}</dd>
                <dt className="text-body-sm text-on-surface-variant">déjà existante{result.existingCount > 1 ? 's' : ''}</dt>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                <dd className="text-headline-sm font-semibold text-on-surface">{result.duplicateInFileCount}</dd>
                <dt className="text-body-sm text-on-surface-variant">doublon{result.duplicateInFileCount > 1 ? 's' : ''} ignoré{result.duplicateInFileCount > 1 ? 's' : ''}</dt>
              </div>
            </dl>
            {result.existingCount > 0 && (
              <div className="text-body-sm text-on-surface-variant">
                <p className="mb-1">Les catégories déjà existantes n'ont pas été modifiées :</p>
                <p className="text-on-surface">{result.existingNames.join(', ')}</p>
              </div>
            )}
            <div className="flex justify-end mt-2 pt-4 border-t border-outline-variant">
              <Button type="button" onClick={onClose}>
                Terminer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
              <p className="mb-1">La première ligne contient les en-têtes :</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><strong className="text-on-surface">NOM</strong> (obligatoire ; CATEGORIE, CATEGORY, NAME ou LIBELLE acceptés)</li>
                <li><strong className="text-on-surface">DESCRIPTION</strong> (facultative)</li>
              </ul>
              <p className="mt-2">Une catégorie qui existe déjà est laissée telle quelle. Une ligne invalide fait refuser tout le fichier.</p>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1" htmlFor="categoriesFile">
                Fichier *
              </label>
              <input
                id="categoriesFile"
                type="file"
                accept={IMPORT_EXTENSIONS.join(',')}
                onChange={handleFileChange}
                className="w-full text-body-sm text-on-surface file:mr-3 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container file:px-3 file:py-2 file:text-on-surface cursor-pointer"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm" role="alert">
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{error}</span>
                </p>
                {rowErrors.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto list-disc pl-6 space-y-0.5">
                    {rowErrors.map((rowError, index) => (
                      <li key={index}>
                        {rowError.row > 0 ? `Ligne ${rowError.row} : ` : ''}
                        {rowError.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-outline-variant">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={!file || loading}>
                {loading ? 'Import en cours...' : 'Importer'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
