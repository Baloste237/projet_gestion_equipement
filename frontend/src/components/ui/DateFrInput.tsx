import React from 'react';
import { maskDateFr } from '../../utils/dateFr';

interface DateFrInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Message d'erreur affiché sous le champ (la validation est faite par l'appelant) */
  error?: string;
}

// Champ de date en jj/mm/AAAA : texte à masque, donc indépendant de la langue du navigateur
// (un champ « date » natif suit les réglages du système).
export const DateFrInput: React.FC<DateFrInputProps> = ({ id, label, value, onChange, error }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
      {label}
    </label>
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="jj/mm/aaaa"
      maxLength={10}
      value={value}
      onChange={(event) => onChange(maskDateFr(event.target.value))}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-32 bg-surface-container-lowest border rounded-lg py-2 px-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none ${
        error ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'
      }`}
    />
    {error && (
      <span id={`${id}-error`} role="alert" className="text-xs text-error max-w-44">
        {error}
      </span>
    )}
  </div>
);
