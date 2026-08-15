import React, { useId } from 'react';

const controlClasses = [
  'w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5',
  'text-brand-charcoal placeholder:text-slate-500',
  'shadow-none transition-colors duration-200',
  'hover:border-brand-black',
  'focus:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow/40',
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70',
].join(' ');

const labelClasses = 'mb-1.5 block text-sm font-semibold text-brand-charcoal';
const helperClasses = 'mt-1.5 text-xs text-slate-500';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const id = useId();

  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      <input id={id} className={`${controlClasses} ${className}`} {...props} />
      {helperText && <p className={helperClasses}>{helperText}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  helperText,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const id = useId();

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      )}
      <textarea id={id} className={`${controlClasses} min-h-28 resize-y ${className}`} {...props} />
      {helperText && <p className={helperClasses}>{helperText}</p>}
    </div>
  );
};
