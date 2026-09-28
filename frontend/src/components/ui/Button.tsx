import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-label-md text-label-md transition-all duration-200 active:scale-[0.98]';
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const variants = {
    primary: 'bg-primary text-on-primary py-sm shadow-[0_0_15px_rgba(77,142,255,0.15)] hover:shadow-[0_0_25px_rgba(77,142,255,0.25)] hover:bg-primary-fixed uppercase tracking-widest',
    secondary: 'bg-inverse-primary hover:bg-primary-container text-on-primary py-sm px-md uppercase tracking-widest',
    outline: 'bg-surface-container-low border border-outline-variant py-sm text-on-surface hover:bg-surface-variant',
    ghost: 'bg-[#151515] hover:bg-surface-container border border-surface-container-highest text-on-surface py-2 px-md',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {icon && <span className="flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};
