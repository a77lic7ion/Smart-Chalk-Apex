import React from 'react';

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantClasses = {
  primary: 'bg-brand-yellow text-white hover:bg-yellow-500 disabled:bg-stone-300',
  secondary: 'bg-stone-200 text-stone-800 hover:bg-stone-300 disabled:bg-stone-100',
  ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 disabled:text-stone-300',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-200',
};

const variantRingClasses = {
  primary: 'focus:ring-brand-yellow',
  secondary: 'focus:ring-stone-400',
  ghost: 'focus:ring-stone-400',
  danger: 'focus:ring-red-500',
}

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
      className={`font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${sizeClasses[size]} ${variantClasses[variant]} ${variantRingClasses[variant]} ${isLoading ? 'cursor-wait' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};