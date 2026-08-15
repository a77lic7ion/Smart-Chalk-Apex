import React from 'react';

const sizeClasses = {
  sm: 'min-h-11 px-3 py-2 text-xs',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

const baseClasses = [
  'inline-flex items-center justify-center gap-2',
  'rounded-xl border font-semibold',
  'transition-colors duration-200',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const variantClasses = {
  primary: [
    'border-brand-yellow bg-brand-yellow text-brand-black',
    'hover:bg-yellow-300 hover:border-yellow-300',
    'active:bg-yellow-400',
    'disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-600',
  ].join(' '),
  secondary: [
    'border-slate-300 bg-white text-brand-black',
    'hover:border-brand-black hover:bg-brand-paper',
    'active:bg-slate-100',
    'disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500',
  ].join(' '),
  ghost: [
    'border-transparent bg-transparent text-brand-black',
    'hover:border-slate-300 hover:bg-brand-paper',
    'active:bg-slate-100',
    'disabled:text-slate-500',
  ].join(' '),
  danger: [
    'border-brand-black bg-transparent text-brand-black',
    'hover:border-brand-black hover:bg-brand-black hover:text-brand-yellow',
    'active:bg-brand-charcoal',
    'disabled:border-slate-300 disabled:text-slate-500',
  ].join(' '),
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  ...props
}) => {
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${isLoading ? 'cursor-wait' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <svg
          className="-ml-1 h-5 w-5 animate-spin text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
