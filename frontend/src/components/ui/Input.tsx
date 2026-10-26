import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  inset?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, inset = false, className = '', id, ...props }, ref) => {
    const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
    
    return (
      <div className="flex flex-col gap-xs w-full">
        <label 
          className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" 
          htmlFor={inputId}
        >
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-opacity-50 flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface 
              focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors 
              placeholder:text-outline placeholder:text-opacity-30
              ${inset ? 'input-inset border-surface-container-highest px-sm py-2' : 'bg-surface-container-lowest py-sm pr-3'}
              ${icon && !inset ? 'pl-10' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
