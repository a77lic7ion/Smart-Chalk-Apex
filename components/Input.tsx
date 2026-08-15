import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, helperText, className = '', wrapperClassName = '', ...props }) => {
  const id = useId();
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="block text-sm font-medium text-brand-charcoal mb-1">{label}</label>
      <input
        id={id}
        className={`w-full p-2 border border-stone-300 rounded-lg shadow-sm focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow transition-shadow ${className}`}
        {...props}
      />
      {helperText && <p className="mt-1 text-xs text-stone-500">{helperText}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, helperText, className = '', wrapperClassName = '', ...props }) => {
  const id = useId();
  return (
    <div className={wrapperClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-brand-charcoal mb-1">{label}</label>}
      <textarea
        id={id}
        className={`w-full p-2 border border-stone-300 rounded-lg shadow-sm focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow transition-shadow ${className}`}
        {...props}
      />
      {helperText && <p className="mt-1 text-xs text-stone-500">{helperText}</p>}
    </div>
  );
};