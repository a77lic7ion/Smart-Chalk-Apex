import React, { useId } from 'react';

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

export const Select: React.FC<SelectProps> = ({ label, options, helperText, className, wrapperClassName = '', ...props }) => {
  const id = useId();
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="block text-sm font-medium text-brand-charcoal mb-1">{label}</label>
      <select
        id={id}
        className={`w-full p-2 border border-stone-300 rounded-lg shadow-sm focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow transition-shadow ${className}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && <p className="mt-1 text-xs text-stone-500">{helperText}</p>}
    </div>
  );
};