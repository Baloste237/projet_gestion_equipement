import React, { useState, useEffect } from 'react';
import { userService, departmentService, type Department, type User } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { COUNTRIES } from '../../data/countries';
import { getImageUrl } from '../../utils/imageUrl';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSuccess, userToEdit }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('CM');
  const [role, setRole] = useState<'ADMIN' | 'RESPONSABLE' | 'EMPLOYE' | 'AUDITEUR'>('EMPLOYE');
  const [departmentId, setDepartmentId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch departments for dropdown
      departmentService.getAll()
        .then((res) => {
          if (res.data?.data) {
            setDepartments(res.data.data);
          }
        })
        .catch((err) => console.error('Erreur chargement départements:', err));

      if (userToEdit) {
        setFirstName(userToEdit.firstName || '');
        setLastName(userToEdit.lastName || '');
        setEmail(userToEdit.email || '');
        setPhone(userToEdit.phone || '');
        setCountryCode(userToEdit.countryCode || 'CM');
        setRole(userToEdit.role || 'EMPLOYE');
        setDepartmentId(userToEdit.departmentId || '');
        setAvatarUrl(userToEdit.avatarUrl || '');
        setIsActive(userToEdit.isActive !== undefined ? userToEdit.isActive : userToEdit.status !== 'INACTIF');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setCountryCode('CM');
        setRole('EMPLOYE');
        setDepartmentId('');
        setAvatarUrl('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, userToEdit]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("La taille de l'image ne doit pas dépasser 5 Mo.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (userToEdit) {
        // Update user profile and role
        await Promise.all([
          userService.updateRole(userToEdit.id, { role, departmentId: departmentId || undefined }),
          userService.updateProfile(userToEdit.id, { firstName, lastName, avatarUrl: avatarUrl || undefined, phone: phone || undefined })
        ]);
      } else {
        // Create new user
        await userService.create({
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          role,
          departmentId: departmentId || undefined,
          avatarUrl: avatarUrl || undefined,
          isActive,
          status: isActive ? 'ACTIF' : 'INACTIF',
          authUserId: crypto.randomUUID(),
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur sauvegarde utilisateur:', err);
      const apiError = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors de la sauvegarde.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-surface-container-high border border-outline-variant rounded-2xl p-6 sm:p-8 w-full max-w-3xl shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-sm">
              <span className="material-symbols-outlined text-2xl">{userToEdit ? 'edit' : 'person_add'}</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {userToEdit ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {userToEdit ? "Mettre à jour le profil, le rôle et le département" : "Créer un nouveau profil utilisateur dans EQUIP-CORE"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-body-sm flex items-center gap-3">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-5 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
            <div className="w-16 h-16 rounded-full border-2 border-primary/40 bg-surface-container flex items-center justify-center overflow-hidden shrink-0 text-primary font-bold text-2xl shadow-md">
              {avatarUrl ? (
                <img src={getImageUrl(avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (firstName ? firstName.charAt(0) : 'U').toUpperCase()
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="user-avatar-file"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-variant border border-outline-variant text-on-surface text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">upload</span>
                  <span>Choisir une photo</span>
                </label>
                <input
                  id="user-avatar-file"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <span className="text-xs text-on-surface-variant">PNG, JPG ou WEBP (Max 5 Mo)</span>
              </div>
              <input
                type="text"
                placeholder="Ou collez l'URL de l'image (https://...)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg py-1.5 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* User Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="firstName">
                Prénom *
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Ex: Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="lastName">
                Nom *
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Ex: Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="userEmail">
                Adresse Email *
              </label>
              <input
                id="userEmail"
                type="email"
                placeholder="jean.dupont@entreprise.com"
                disabled={!!userToEdit}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="phone">
                Pays & Numéro de Téléphone
              </label>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary">
                {/* Flag Icon & Code Display */}
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-container border-r border-outline-variant shrink-0">
                  <img
                    src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                    alt={selectedCountry?.name || countryCode}
                    className="w-6 h-4 object-cover rounded-sm shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="font-mono text-xs font-bold text-on-surface">{selectedCountry?.dialCode || '+237'}</span>
                </div>

                <select
                  id="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-transparent border-none py-2.5 px-2 text-body-sm text-on-surface focus:outline-none cursor-pointer max-w-[140px]"
                  title="Sélectionner le pays"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-surface-container-high text-on-surface">
                      {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>

                <input
                  id="phone"
                  type="tel"
                  placeholder="6 99 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-none py-2.5 px-3 text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="role">
                Rôle Système
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="EMPLOYE" className="bg-surface-container-high">Employé</option>
                <option value="RESPONSABLE" className="bg-surface-container-high">Responsable</option>
                <option value="ADMIN" className="bg-surface-container-high">Administrateur</option>
                <option value="AUDITEUR" className="bg-surface-container-high">Auditeur</option>
              </select>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="departmentId">
                Département
              </label>
              <select
                id="departmentId"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="" className="bg-surface-container-high">-- Aucun --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-surface-container-high">
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5">
                Statut Utilisateur
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm border flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                  <span>{isActive ? 'ACTIF' : 'INACTIF'}</span>
                </div>
                <span className="material-symbols-outlined text-xl">
                  {isActive ? 'toggle_on' : 'toggle_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-outline-variant">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : userToEdit ? 'Mettre à jour' : 'Créer l\'utilisateur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

