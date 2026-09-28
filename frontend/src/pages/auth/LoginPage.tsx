import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastMsg(null);
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      const { accessToken, refreshToken, user } = response.data?.data || {};
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        
        setToastMsg({
          type: 'success',
          message: 'Connexion réussie ! Bienvenue sur la plateforme EQUIP-CORE.',
        });

        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        const msg = 'Réponse invalide du serveur d\'authentification.';
        setError(msg);
        setToastMsg({ type: 'error', message: msg });
      }
    } catch (err: any) {
      console.error('Erreur lors de la connexion:', err);
      const apiError = err.response?.data?.error?.message || err.response?.data?.message || 'Identifiants invalides ou mot de passe incorrect.';
      setError(apiError);
      setToastMsg({
        type: 'error',
        message: `Échec de connexion : ${apiError}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitted(true);
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 antialiased text-on-surface w-full relative">
      {/* Toast Notification Popup */}
      {toastMsg && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-bounce transition-all ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 backdrop-blur-md'
              : 'bg-red-950/90 border-red-500/50 text-red-300 backdrop-blur-md'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {toastMsg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium text-sm">{toastMsg.message}</span>
        </div>
      )}

      <Card variant="glass" className="mb-8">
        {/* Background subtle glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary rounded-full opacity-5 blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-tertiary rounded-full opacity-5 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center mb-lg">
          <div className="w-16 h-16 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center mb-sm shadow-md">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              deployed_code
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg md:font-headline-lg md:text-headline-lg text-on-surface text-center tracking-tight">
            EQUIP-CORE
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant text-center mt-2">
            Secure Enterprise Access
          </p>
        </div>

        <form className="flex flex-col gap-md relative z-10" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Corporate Email"
            id="email"
            type="email"
            placeholder="admin@enterprise.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<span className="material-symbols-outlined">mail</span>}
            required
          />

          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-center mb-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotPassword(true);
                }}
                className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-opacity-50 flex items-center justify-center z-10">lock</span>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-sm pl-10 pr-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-outline placeholder:text-opacity-30 relative"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-xs">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 rounded bg-surface-container-lowest border-outline-variant text-primary focus:ring-primary focus:ring-offset-background"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer">
              Persist session
            </label>
          </div>

          <Button type="submit" fullWidth className="mt-sm" disabled={loading}>
            {loading ? 'Connexion...' : 'Authenticate'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Button>
        </form>

        <div className="relative z-10 mt-margin mb-md">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#1a1a1a] px-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Or integrate via
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-sm relative z-10">
          <Button variant="outline" fullWidth icon={<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>}>
            Google Workspace
          </Button>
          <Button variant="outline" fullWidth icon={<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>business</span>}>
            Azure Active Directory
          </Button>
        </div>

        {/* Section S'inscrire si vous n'avez pas de compte */}
        <div className="mt-lg text-center relative z-10 pt-md border-t border-outline-variant/30">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Vous n'avez pas de compte ?{' '}
            <Link 
              to="/register" 
              className="font-label-md text-primary hover:text-primary-fixed font-semibold transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1 ml-1"
            >
              S'inscrire
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </p>
        </div>

        <div className="mt-md text-center relative z-10">
          <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60">
            System build v4.2.1 • Security Protocol Alpha
          </p>
        </div>
      </Card>

      {/* Modal Mot de passe oublié */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">lock_reset</span>
                Mot de passe oublié ?
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSubmitted(false);
                }}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
                </div>
                <h3 className="font-headline-xs text-headline-xs text-on-surface mb-2 font-medium">Demande envoyée</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
                  Si un compte est associé à <span className="text-on-surface font-medium">{forgotEmail}</span>, un e-mail avec les instructions de réinitialisation vous sera envoyé.
                </p>
                <Button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSubmitted(false);
                  }}
                  fullWidth
                >
                  Fermer
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Saisissez votre adresse email professionnelle ci-dessous pour recevoir les instructions de réinitialisation.
                </p>
                <Input
                  label="Email professionnel"
                  id="forgotEmail"
                  type="email"
                  placeholder="admin@enterprise.local"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  icon={<span className="material-symbols-outlined">mail</span>}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    Envoyer
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
