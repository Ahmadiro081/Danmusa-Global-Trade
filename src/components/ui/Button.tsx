import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'navy' | 'accent' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#2563EB] text-white hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB] shadow-xs',
  navy:
    'bg-[#10243A] text-white hover:bg-[#1A3554] focus-visible:ring-[#10243A] shadow-xs',
  accent:
    'bg-[#F4A62A] text-[#10243A] hover:bg-[#E0951D] focus-visible:ring-[#F4A62A] font-semibold shadow-xs',
  outline:
    'border border-slate-300 bg-white text-[#202B38] hover:border-[#10243A] hover:bg-[#F5F7FA] focus-visible:ring-[#2563EB]',
  ghost:
    'bg-transparent text-[#202B38] hover:bg-slate-100 focus-visible:ring-[#2563EB]',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#DC2626] shadow-xs',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs font-medium rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm font-semibold rounded-lg gap-2',
  lg: 'h-12 px-6 text-sm font-semibold rounded-lg gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
