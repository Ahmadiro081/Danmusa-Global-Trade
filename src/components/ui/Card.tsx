import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-7 sm:p-8',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  interactive = false,
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white ${
        interactive
          ? 'transition-all duration-200 hover:border-slate-300 hover:shadow-md'
          : 'shadow-2xs'
      } ${PADDING_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
