import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface BaseFieldProps {
  label: string;
  id: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

const BASE_INPUT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#202B38] placeholder:text-slate-400 transition-colors focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F5F7FA] disabled:text-[#64748B]';

export function TextField({
  label,
  id,
  helperText,
  error,
  required,
  className = '',
  ...props
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#202B38]"
      >
        {label}
        {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
      </label>
      <input
        id={id}
        required={required}
        className={`${BASE_INPUT_CLASSES} ${
          error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : ''
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs font-medium text-[#DC2626]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  id,
  helperText,
  error,
  required,
  className = '',
  children,
  ...props
}: BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#202B38]"
      >
        {label}
        {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
      </label>
      <select
        id={id}
        required={required}
        className={`${BASE_INPUT_CLASSES} ${
          error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs font-medium text-[#DC2626]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  id,
  helperText,
  error,
  required,
  className = '',
  ...props
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#202B38]"
      >
        {label}
        {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
      </label>
      <textarea
        id={id}
        required={required}
        className={`${BASE_INPUT_CLASSES} min-h-[108px] resize-y ${
          error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : ''
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs font-medium text-[#DC2626]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
}
