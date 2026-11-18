import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldWrapper({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#0B1E3D]"
      >
        {label}
        {required ? (
          <span className="ml-1 text-[#8E6B0C]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const BASE_INPUT_CLASSES =
  'w-full min-h-[42px] rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#0B1E3D] placeholder:text-slate-400 focus:border-[#0B1E3D] focus:outline-none focus:ring-2 focus:ring-[#0B1E3D]/15 disabled:bg-slate-50 disabled:text-slate-500';

export function TextInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE_INPUT_CLASSES} ${className}`} {...props} />;
}

export function SelectInput({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${BASE_INPUT_CLASSES} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function TextAreaInput({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0B1E3D] placeholder:text-slate-400 focus:border-[#0B1E3D] focus:outline-none focus:ring-2 focus:ring-[#0B1E3D]/15 disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
      {...props}
    />
  );
}
