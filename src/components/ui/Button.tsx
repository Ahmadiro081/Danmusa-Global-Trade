import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#0B1E3D] text-white hover:bg-[#15315E] border border-[#0B1E3D] focus-visible:ring-2 focus-visible:ring-[#0B1E3D] focus-visible:ring-offset-2',
  accent:
    'bg-[#C59B27] text-[#0B1E3D] font-semibold hover:bg-[#B4891A] border border-[#C59B27] focus-visible:ring-2 focus-visible:ring-[#C59B27] focus-visible:ring-offset-2',
  outline:
    'bg-white text-[#0B1E3D] border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-[#0B1E3D] focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 hover:text-[#0B1E3D] focus-visible:ring-2 focus-visible:ring-[#0B1E3D] focus-visible:ring-offset-2',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-4 py-2 text-xs',
  md: 'min-h-[40px] px-5 py-2.5 text-sm',
  lg: 'min-h-[44px] px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
