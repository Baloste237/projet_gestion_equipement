import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'glass' | 'auth' | 'default';
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    glass: 'glass-card border-outline-variant shadow-2xl relative overflow-hidden',
    auth: 'auth-card shadow-[0_24px_48px_rgba(0,0,0,0.4)] relative overflow-hidden',
    default: 'bg-surface-container border-outline-variant shadow-md',
  };

  return (
    <div className={`w-full max-w-md rounded-xl border p-margin ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
