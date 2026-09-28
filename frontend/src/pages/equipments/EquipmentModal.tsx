import React, { useState, useEffect } from 'react';
import {
  type Equipment,
  type Category,
  type Supplier,
  type EquipmentStatus,
  type CreateEquipmentDTO,
  type UpdateEquipmentDTO,
  categoryService,
  supplierService,
  equipmentService,
} from '../../services/api';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  equipmentToEdit?: Equipment | null;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  equipmentToEdit,
}) => {
  const isEditing = Boolean(equipmentToEdit);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('AVAILABLE');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategoriesAndSuppliers();
      if (equipmentToEdit) {
        setName(equipmentToEdit.name || '');
        setSerialNumber(equipmentToEdit.serialNumber || '');
        setCategoryId(equipmentToEdit.categoryId || '');
        setSupplierId(equipmentToEdit.supplierId || '');
        setStatus(equipmentToEdit.status || 'AVAILABLE');
        setImagePreview(equipmentToEdit.imageUrl || null);
      } else {
        setName('');
        setSerialNumber('');
        setCategoryId('');
        setSupplierId('');
        setStatus('AVAILABLE');
        setImagePreview(null);
      }
      setImageFile(null);
      setError(null);
    }
  }, [isOpen, equipmentToEdit]);

  const fetchCategoriesAndSuppliers = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        categoryService.getAll(),
        supplierService.getAll(),
      ]);
      setCategories(catRes.data.data || []);
      setSuppliers(supRes.data.data || []);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des catégories/fournisseurs:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom de l\'équipement est requis');
      return;
    }
    if (!serialNumber.trim()) {
      setError('Le numéro de série est requis');
      return;
    }
    if (!categoryId) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetId: string;

      if (isEditing && equipmentToEdit) {
        const updatePayload: UpdateEquipmentDTO = {
          name,
          serialNumber,
          categoryId,
          supplierId: supplierId || null,
          status,
        };
        await equipmentService.update(equipmentToEdit.id, updatePayload);
        targetId = equipmentToEdit.id;
      } else {
        const createPayload: CreateEquipmentDTO = {
          name,
          serialNumber,
          categoryId,
          supplierId: supplierId || null,
          status,
        };
        const res = await equipmentService.create(createPayload);
        targetId = res.data.data.id;
      }

      if (imageFile && targetId) {
        await equipmentService.uploadImage(targetId, imageFile);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Une erreur est survenue';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-[#262626] border border-[#333333] rounded-xl flex flex-col shadow-[0_24px_48px_rgba(0,0,0,0.5)] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333333] flex justify-between items-center bg-[#262626] sticky top-0 z-10">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-2xl">construction</span>
            <h2 className="font-headline-md text-xl font-bold text-on-surface m-0">
              {isEditing ? "Modifier l'Équipement" : "Enregistrer un Nouvel Équipement"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 bg-[#262626]">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error p-3 rounded-lg flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{error}</span>
            </div>
          )}

          <form id="equipment-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Section 1: Identification */}
            <fieldset className="flex flex-col gap-4">
              <legend className="font-label-md text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                1. Identification
              </legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Equipment Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="eq-name" className="text-xs font-medium text-on-surface-variant">
                    Nom de l'Équipement <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">
                      label
                    </span>
                    <input
                      id="eq-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: SRV-PROD-01"
                      className="w-full bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded py-2 pl-10 pr-3 focus:outline-none focus:border-primary transition-colors placeholder:text-outline-variant/50"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="eq-category" className="text-xs font-medium text-on-surface-variant">
                    Catégorie <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">
                      layers
                    </span>
                    <select
                      id="eq-category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded py-2 pl-10 pr-8 appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      required
                    >
                      <option value="" disabled>Sélectionner une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Serial Number */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label htmlFor="eq-serial" className="text-xs font-medium text-on-surface-variant">
                    Numéro de Série <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">
                      qr_code
                    </span>
                    <input
                      id="eq-serial"
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="S/N ou Tag de service (ex: SN-88392-XXT)"
                      className="w-full bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm font-mono rounded py-2 pl-10 pr-3 focus:outline-none focus:border-primary transition-colors placeholder:text-outline-variant/50"
                      required
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <hr className="border-[#333333]" />

            {/* Section 2: Fournisseur & Statut */}
            <fieldset className="flex flex-col gap-4">
              <legend className="font-label-md text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                2. Fournisseur & Statut
              </legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="eq-supplier" className="text-xs font-medium text-on-surface-variant">
                    Fournisseur
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">
                      store
                    </span>
                    <select
                      id="eq-supplier"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded py-2 pl-10 pr-8 appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="">Aucun fournisseur</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="eq-status" className="text-xs font-medium text-on-surface-variant">
                    Statut de l'Équipement <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">
                      pulse_alert
                    </span>
                    <select
                      id="eq-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                      className="w-full bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm rounded py-2 pl-10 pr-8 appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="AVAILABLE">Disponible (Disponible)</option>
                      <option value="ASSIGNED">Assigné (En utilisation)</option>
                      <option value="IN_MAINTENANCE">En Maintenance</option>
                      <option value="RETIRED">Retiré (Hors service)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
            </fieldset>

            <hr className="border-[#333333]" />

            {/* Section 3: Photo / Image */}
            <fieldset className="flex flex-col gap-4">
              <legend className="font-label-md text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                3. Photo / Image de l'Équipement
              </legend>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-[#0D0D0D] border border-[#333333] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Prévisualisation"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-outline-variant">
                      photo_camera
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <label
                    htmlFor="eq-image-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] border border-[#333333] text-on-surface text-sm font-medium rounded-lg cursor-pointer transition-colors w-fit"
                  >
                    <span className="material-symbols-outlined text-lg">upload</span>
                    <span>{imagePreview ? "Changer la photo" : "Téléverser une photo"}</span>
                  </label>
                  <input
                    id="eq-image-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xs text-on-surface-variant">
                    Formats acceptés : PNG, JPG, WEBP. Taille max : 5 Mo.
                  </p>
                </div>
              </div>
            </fieldset>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#333333] bg-[#262626] flex justify-end items-center gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded text-sm text-on-surface hover:bg-surface-variant transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="equipment-form"
            disabled={loading}
            className="px-5 py-2 rounded text-sm bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="material-symbols-outlined animate-spin text-base">sync</span>}
            <span>{isEditing ? 'Mettre à jour' : "Enregistrer l'Actif"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
