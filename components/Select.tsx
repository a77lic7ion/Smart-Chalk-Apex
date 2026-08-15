import React, { useId } from 'react';

const controlClasses = [
  'w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5',
  'text-brand-charcoal',
  'shadow-none transition-colors duration-200',
  'hover:border-brand-black',
  'focus:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow/40',
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70',
].join(' ');

const labelClasses = 'mb-1.5 block text-sm font-semibold text-brand-charcoal';
const helperClasses = 'mt-1.5 text-xs text-slate-500';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  helperText?: string;
  wrapperClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
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
      <select id={id} className={`${controlClasses} ${className}`} {...props}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && <p className={helperClasses}>{helperText}</p>}
    </div>
  );
};
