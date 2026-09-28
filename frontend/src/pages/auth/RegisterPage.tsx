import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    corporateEmail: '',
    companyName: '',
    jobTitle: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.register({
        email: formData.corporateEmail,
        password: formData.password,
      });
      // Redirect to login upon successful account creation
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      console.error('Erreur inscription:', err);
      const apiError = err.response?.data?.error?.message || err.response?.data?.message || 'Erreur lors de la création du compte.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body-md antialiased relative overflow-hidden bg-surface-container-lowest text-on-surface">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none z-0"></div>
      
      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center p-margin relative z-10 w-full">
        <div className="auth-card border rounded-lg shadow-[0_24px_48px_rgba(0,0,0,0.4)] w-full max-w-lg overflow-hidden flex flex-col">
          {/* Card Header */}
          <div className="p-lg border-b border-surface-container-highest">
            <div className="flex items-center justify-between mb-sm">
              <div className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">hub</span>
                EQUIP-CORE
              </div>
              <div className="border border-tertiary/30 text-tertiary px-2 py-1 rounded-sm font-label-sm text-label-sm uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                Security Protocol Alpha
              </div>
            </div>
            <h1 className="font-headline-lg text-headline-lg md:hidden mb-xs text-on-surface">Create Account</h1>
            <h1 className="hidden md:block font-headline-lg text-headline-lg mb-xs text-on-surface">Create your Enterprise Account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Start managing your organizational resources with precision.</p>
          </div>

          {/* Card Body / Form */}
          <div className="p-lg flex-grow flex flex-col gap-md">
            <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{error}</span>
                </div>
              )}
              
              <Input
                label="Full Name"
                id="fullName"
                placeholder="Jane Doe"
                value={formData.fullName}
                onChange={handleChange}
                inset
                required
              />

              {/* Grid for Company Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <Input
                  label="Corporate Email"
                  id="corporateEmail"
                  type="email"
                  placeholder="jane.doe@company.com"
                  value={formData.corporateEmail}
                  onChange={handleChange}
                  inset
                  required
                />
                <Input
                  label="Company Name"
                  id="companyName"
                  placeholder="Acme Corp"
                  value={formData.companyName}
                  onChange={handleChange}
                  inset
                  required
                />
              </div>

              {/* Job Title */}
              <Input
                label="Job Title"
                id="jobTitle"
                placeholder="Senior Resource Manager"
                value={formData.jobTitle}
                onChange={handleChange}
                inset
                required
              />

              {/* Password */}
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant flex justify-between" htmlFor="password">
                  Password
                </label>
                <input
                  className="input-inset border border-surface-container-highest rounded focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-on-surface font-body-md text-body-md px-sm py-2 w-full transition-colors"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {/* Strength Indicator */}
                <div className="flex gap-1 mt-1 h-1 w-full">
                  <div className="flex-1 bg-surface-container-highest rounded-full"></div>
                  <div className="flex-1 bg-surface-container-highest rounded-full"></div>
                  <div className="flex-1 bg-surface-container-highest rounded-full"></div>
                  <div className="flex-1 bg-surface-container-highest rounded-full"></div>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">Must be at least 12 characters, include a number and symbol.</span>
              </div>

              {/* Submit */}
              <button 
                className="bg-inverse-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm py-sm px-md rounded transition-colors mt-sm flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'CRÉATION EN COURS...' : 'CREATE ACCOUNT'}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-md my-sm">
              <div className="h-px bg-surface-container-highest flex-1"></div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">OR REGISTER VIA</span>
              <div className="h-px bg-surface-container-highest flex-1"></div>
            </div>

            {/* SSO Options */}
            <div className="flex flex-col gap-sm">
              <button className="bg-[#151515] hover:bg-surface-container border border-surface-container-highest text-on-surface font-label-md text-label-md py-2 px-md rounded transition-colors flex items-center justify-center gap-sm" type="button">
                <span className="material-symbols-outlined text-[20px]">work</span>
                Google Workspace
              </button>
              <button className="bg-[#151515] hover:bg-surface-container border border-surface-container-highest text-on-surface font-label-md text-label-md py-2 px-md rounded transition-colors flex items-center justify-center gap-sm" type="button">
                <span className="material-symbols-outlined text-[20px]">cloud</span>
                Azure Active Directory
              </button>
            </div>
          </div>

          {/* Card Footer */}
          <div className="p-lg border-t border-surface-container-highest bg-[#151515] flex flex-col items-center justify-center gap-sm">
            <Link to="/login" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline">
              Vous avez déjà un compte ? Se connecter
            </Link>
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center opacity-70">
              By creating an account, you agree to the <a href="#" className="underline hover:text-on-surface">Terms of Service</a> and <a href="#" className="underline hover:text-on-surface">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Component from JSON */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant w-full z-10 relative mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin py-md w-full max-w-[1440px] mx-auto">
          <div className="font-label-md text-label-md font-black text-on-surface mb-4 md:mb-0">
            EQUIP-CORE
          </div>
          <div className="font-label-sm text-label-sm text-secondary text-center mb-4 md:mb-0">
            © 2024 EQUIP-CORE Systems. All rights reserved.
          </div>
          <ul className="flex flex-wrap justify-center gap-4">
            <li><a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary underline transition-all cursor-pointer">Privacy Policy</a></li>
            <li><a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary underline transition-all cursor-pointer">Terms of Service</a></li>
            <li><a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary underline transition-all cursor-pointer">Security Audit</a></li>
            <li><a href="#" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary underline transition-all cursor-pointer">Contact Support</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
};
