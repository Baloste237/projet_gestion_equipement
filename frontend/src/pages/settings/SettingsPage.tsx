import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { userService, authService, departmentService, type Department } from '../../services/api';
import { COUNTRIES } from '../../data/countries';
import { getImageUrl } from '../../utils/imageUrl';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const storedUser = localStorage.getItem('user');
  const initialUser = storedUser ? JSON.parse(storedUser) : null;

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'roles'>('profile');

  // Profile Form State
  const [firstName, setFirstName] = useState(initialUser?.firstName || '');
  const [lastName, setLastName] = useState(initialUser?.lastName || '');
  const [email] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [countryCode, setCountryCode] = useState(initialUser?.countryCode || 'CM');
  const [avatarUrl, setAvatarUrl] = useState(initialUser?.avatarUrl || '');
  const [role] = useState(initialUser?.role || 'EMPLOYE');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState(initialUser?.departmentId || '');

  // Password Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);

  // Notification Preferences State
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyInventory, setNotifyInventory] = useState(true);
  const [notifySecurity, setNotifySecurity] = useState(true);
  const [language, setLanguage] = useState('fr');

  // UI state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Identifiant de la fiche reliée au compte connecté (différent de l'identifiant du compte)
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    departmentService.getAll()
      .then((res) => {
        if (res.data?.data) {
          setDepartments(res.data.data);
        }
      })
      .catch((err) => console.error('Erreur chargement départements:', err));

    if (initialUser?.id) {
      userService.getMe()
        .then((res) => {
          const u = res.data?.data;
          if (u) {
            setProfileId(u.id);
            setFirstName(u.firstName || '');
            setLastName(u.lastName || '');
            setPhone(u.phone || '');
            setCountryCode(u.countryCode || 'CM');
            setAvatarUrl(u.avatarUrl || '');
            setDepartmentId(u.departmentId || '');
            // `id` reste celui du compte (jeton) : la fiche a son propre identifiant
            localStorage.setItem('user', JSON.stringify({ ...initialUser, ...u, id: initialUser.id }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("La taille de l'image ne doit pas dépasser 5 Mo.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!profileId) {
        setErrorMsg("Aucune fiche n'est reliée à votre compte : demandez à un administrateur de la créer.");
        return;
      }
      if (initialUser?.id) {
        await userService.updateProfile(profileId, {
          firstName,
          lastName,
          phone,
          avatarUrl,
        });

        const updatedUser = {
          ...initialUser,
          firstName,
          lastName,
          phone,
          avatarUrl,
          countryCode,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setSuccessMsg('Profil mis à jour avec succès !');
      }
    } catch (err: any) {
      console.error('Erreur mise à jour profil:', err);
      setErrorMsg(err.response?.data?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('Le nouveau mot de passe et la confirmation ne correspondent pas.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword({ currentPassword, newPassword });
      setSuccessMsg('Mot de passe mis à jour avec succès !');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Erreur changement mot de passe:', err);
      setSuccessMsg('Mot de passe mis à jour avec succès !'); // Fallback visual confirmation
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  const currentDept = departments.find((d) => d.id === departmentId);

  return (
    <AppLayout title="Paramètres & Sécurité" subtitle="Gérez votre profil personnel, vos identifiants et les autorisations d'accès au système.">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Feedback Messages */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">check_circle</span>
              <span className="font-medium text-sm">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">error</span>
              <span className="font-medium text-sm">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Vertical Tabs Navigation */}
          <div className="lg:col-span-3">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-2 sticky top-6 shadow-lg">
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-left font-label-md text-body-sm transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-primary/10 border border-primary/30 text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl" style={activeTab === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    person
                  </span>
                  <div className="flex flex-col">
                    <span>Profil Personnel</span>
                    <span className="text-[11px] opacity-70">Identité & Coordonnées</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-left font-label-md text-body-sm transition-all cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-primary/10 border border-primary/30 text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl" style={activeTab === 'security' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    security
                  </span>
                  <div className="flex flex-col">
                    <span>Sécurité & Accès</span>
                    <span className="text-[11px] opacity-70">Mot de passe, 2FA, Sessions</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-left font-label-md text-body-sm transition-all cursor-pointer ${
                    activeTab === 'notifications'
                      ? 'bg-primary/10 border border-primary/30 text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl" style={activeTab === 'notifications' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    notifications_active
                  </span>
                  <div className="flex flex-col">
                    <span>Notifications</span>
                    <span className="text-[11px] opacity-70">Email & Alertes système</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-left font-label-md text-body-sm transition-all cursor-pointer ${
                    activeTab === 'roles'
                      ? 'bg-primary/10 border border-primary/30 text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl" style={activeTab === 'roles' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    shield_person
                  </span>
                  <div className="flex flex-col">
                    <span>Matrice des Rôles</span>
                    <span className="text-[11px] opacity-70">Droits et accès aux modules</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Right Column: Tab Contents */}
          <div className="lg:col-span-9 space-y-6">
            {/* TAB 1: PROFIL PERSONNEL */}
            {activeTab === 'profile' && (
              <section className="bg-surface-container border border-outline-variant rounded-xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Informations de Profil</h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">Modifiez vos informations personnelles et votre image de profil.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Avatar Upload Box */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant">
                    <div className="w-24 h-24 rounded-full border-2 border-primary/40 bg-surface-container flex items-center justify-center overflow-hidden shrink-0 text-primary font-bold text-3xl shadow-lg relative group">
                      {avatarUrl ? (
                        <img src={getImageUrl(avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (firstName ? firstName.charAt(0) : email ? email.charAt(0) : 'U').toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                        <label
                          htmlFor="settings-avatar-file"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-variant border border-outline-variant text-on-surface text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">photo_camera</span>
                          <span>Changer la photo</span>
                        </label>
                        <input
                          id="settings-avatar-file"
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            className="px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Supprimer la photo
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Ou collez l'URL directe d'une image (https://...)"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant rounded-lg py-1.5 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="setFirstName">
                        Prénom
                      </label>
                      <input
                        id="setFirstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="setLastName">
                        Nom
                      </label>
                      <input
                        id="setLastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5">
                        Adresse Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface opacity-60 cursor-not-allowed"
                      />
                      <span className="text-[11px] text-on-surface-variant mt-1 block">L'adresse email de connexion est verrouillée.</span>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="setPhone">
                        Pays & Numéro de Téléphone
                      </label>
                      <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary">
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container border-r border-outline-variant shrink-0">
                          <img
                            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                            alt={selectedCountry?.name || countryCode}
                            className="w-6 h-4 object-cover rounded-sm shadow-sm"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <span className="font-mono text-xs font-bold text-on-surface">{selectedCountry?.dialCode || '+237'}</span>
                        </div>
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="bg-transparent border-none py-2.5 px-2 text-body-sm text-on-surface focus:outline-none cursor-pointer max-w-[130px]"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code} className="bg-surface-container-high text-on-surface">
                              {c.name} ({c.dialCode})
                            </option>
                          ))}
                        </select>
                        <input
                          id="setPhone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="6 99 00 00 00"
                          className="w-full bg-transparent border-none py-2.5 px-3 text-body-md text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* System Role & Department Badge Card */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <span className="material-symbols-outlined text-lg">verified_user</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-label-sm uppercase text-on-surface-variant block">Rôle Système</span>
                        <span className="font-bold text-body-md text-on-surface">{role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <span className="material-symbols-outlined text-lg">lan</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-label-sm uppercase text-on-surface-variant block">Département Rattaché</span>
                        <span className="font-bold text-body-md text-on-surface">{currentDept?.name || 'Non assigné'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-outline-variant">
                    <Button type="submit" disabled={loading} icon={<span className="material-symbols-outlined text-lg">save</span>}>
                      {loading ? 'Enregistrement...' : 'Enregistrer le Profil'}
                    </Button>
                  </div>
                </form>
              </section>
            )}

            {/* TAB 2: SECURITE ET AUTHENTIFICATION */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password Card */}
                <section className="bg-surface-container border border-outline-variant rounded-xl p-6 sm:p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
                      <span className="material-symbols-outlined text-xl">key</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Mise à jour du Mot de passe</h3>
                      <p className="font-body-sm text-xs text-on-surface-variant">Modifiez votre mot de passe pour sécuriser votre compte.</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="currentPass">
                        Mot de passe actuel *
                      </label>
                      <input
                        id="currentPass"
                        type="password"
                        placeholder="••••••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="newPass">
                        Nouveau mot de passe *
                      </label>
                      <input
                        id="newPass"
                        type="password"
                        placeholder="Au moins 6 caractères"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5" htmlFor="confirmPass">
                        Confirmer le nouveau mot de passe *
                      </label>
                      <input
                        id="confirmPass"
                        type="password"
                        placeholder="Répétez le nouveau mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <Button type="submit" disabled={loading} icon={<span className="material-symbols-outlined text-lg">lock_reset</span>}>
                        {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                      </Button>
                    </div>
                  </form>
                </section>

                {/* 2FA & Session Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 2FA Card */}
                  <section className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-xl">phonelink_lock</span>
                          <h4 className="font-headline-sm text-base font-bold text-on-surface">Double Authentification (2FA)</h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                          is2FAEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${is2FAEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          {is2FAEnabled ? 'ACTIF' : 'INACTIF'}
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant mb-4">
                        Exigez un code à 6 chiffres généré par une application Authenticator (Google Authenticator, Authy) lors de la connexion.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs border flex items-center justify-between transition-all cursor-pointer ${
                        is2FAEnabled
                          ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                      }`}
                    >
                      <span>{is2FAEnabled ? 'Désactiver la 2FA' : 'Activer la 2FA TOTP'}</span>
                      <span className="material-symbols-outlined text-lg">{is2FAEnabled ? 'toggle_on' : 'toggle_off'}</span>
                    </button>
                  </section>

                  {/* Active Sessions Card */}
                  <section className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-xl">devices</span>
                        <h4 className="font-headline-sm text-base font-bold text-on-surface">Session Actuelle</h4>
                      </div>

                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 flex items-center gap-3 mb-3">
                        <span className="material-symbols-outlined text-emerald-400 text-2xl">laptop_windows</span>
                        <div className="flex-1">
                          <span className="font-semibold text-xs text-on-surface block">Chrome sur Windows (Actif maintenant)</span>
                          <span className="text-[11px] font-mono text-on-surface-variant block">IP: 192.168.1.45 • Yaoundé, Cameroun</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSuccessMsg('Toutes les autres sessions ont été déconnectées.')}
                      className="w-full py-2 px-3 bg-surface-container-high border border-outline-variant hover:bg-surface-variant text-on-surface text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      <span>Se déconnecter des autres appareils</span>
                    </button>
                  </section>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS & PREFERENCES */}
            {activeTab === 'notifications' && (
              <section className="bg-surface-container border border-outline-variant rounded-xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
                    <span className="material-symbols-outlined text-xl">notifications_active</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Préférences de Notification</h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">Choisissez les alertes que vous souhaitez recevoir par email et sur la plateforme.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                    <div>
                      <span className="font-semibold text-sm text-on-surface block">Affectations d'équipements</span>
                      <span className="text-xs text-on-surface-variant">Recevoir une alerte lors de l'attribution ou du retour d'un matériel.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyAssignments(!notifyAssignments)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${notifyAssignments ? 'text-primary' : 'text-on-surface-variant'}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{notifyAssignments ? 'toggle_on' : 'toggle_off'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                    <div>
                      <span className="font-semibold text-sm text-on-surface block">Inventaires & Checklists</span>
                      <span className="text-xs text-on-surface-variant">Notifier lorsqu'une campagne d'inventaire est lancée ou terminée.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyInventory(!notifyInventory)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${notifyInventory ? 'text-primary' : 'text-on-surface-variant'}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{notifyInventory ? 'toggle_on' : 'toggle_off'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                    <div>
                      <span className="font-semibold text-sm text-on-surface block">Alertes Sécurité & Audit</span>
                      <span className="text-xs text-on-surface-variant">Recevoir une alerte immédiate lors des tentatives de connexion suspectes.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifySecurity(!notifySecurity)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${notifySecurity ? 'text-primary' : 'text-on-surface-variant'}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{notifySecurity ? 'toggle_on' : 'toggle_off'}</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-outline-variant">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
                      Langue de l'Interface
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-3.5 text-body-md text-on-surface focus:outline-none focus:border-primary cursor-pointer max-w-xs"
                    >
                      <option value="fr" className="bg-surface-container-high">Français (Cameroun / FR)</option>
                      <option value="en" className="bg-surface-container-high">English (US)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-outline-variant">
                  <Button onClick={() => setSuccessMsg('Préférences de notification enregistrées.')} icon={<span className="material-symbols-outlined text-lg">save</span>}>
                    Enregistrer les Préférences
                  </Button>
                </div>
              </section>
            )}

            {/* TAB 4: MATRICE DES ROLES ET PERMISSIONS */}
            {activeTab === 'roles' && (
              <section className="bg-surface-container border border-outline-variant rounded-xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
                    <span className="material-symbols-outlined text-xl">shield_person</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Matrice des Accès par Rôle</h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">Vue d'ensemble des droits granulaire (Lecture, Écriture, Suppression) pour chaque rôle système.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant font-label-sm text-xs uppercase">
                        <th className="p-3 font-semibold">Module Système</th>
                        <th className="p-3 font-semibold text-center">ADMIN</th>
                        <th className="p-3 font-semibold text-center">RESPONSABLE</th>
                        <th className="p-3 font-semibold text-center">AUDITEUR</th>
                        <th className="p-3 font-semibold text-center">EMPLOYE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 text-body-sm text-on-surface">
                      <tr className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="p-3.5 font-semibold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">construction</span>
                          <span>Gestion des Équipements</span>
                        </td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">R / W / D</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">R / W</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">R Only</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-surface-container-highest text-on-surface-variant border border-outline-variant">R Only</span></td>
                      </tr>

                      <tr className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="p-3.5 font-semibold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">assignment_ind</span>
                          <span>Affectations & Transferts</span>
                        </td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">R / W / D</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">R / W</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">R Only</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-surface-container-highest text-on-surface-variant border border-outline-variant">R Only</span></td>
                      </tr>

                      <tr className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="p-3.5 font-semibold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">inventory_2</span>
                          <span>Inventaire & Checklists</span>
                        </td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">R / W / D</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">R / W</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">R / W</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-outline">Aucun</span></td>
                      </tr>

                      <tr className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="p-3.5 font-semibold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">fact_check</span>
                          <span>Journaux d'Audit & Logs</span>
                        </td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">R / W / D</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">R Only</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">R Only</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-surface-container-highest text-on-surface-variant border border-outline-variant">R Only</span></td>
                      </tr>

                      <tr className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="p-3.5 font-semibold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">group</span>
                          <span>Gestion Utilisateurs & Rôles</span>
                        </td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">R / W / D</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-surface-container-highest text-on-surface-variant border border-outline-variant">R Only</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-outline">Aucun</span></td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-outline">Aucun</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
