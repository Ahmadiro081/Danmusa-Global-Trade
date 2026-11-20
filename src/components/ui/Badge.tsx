import type { ReactNode } from 'react';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'navy'
  | 'amber'
  | 'neutral';

interface StatusBadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[#16865C]/10 text-[#16865C] border-[#16865C]/20',
  warning: 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/25',
  danger: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
  info: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  navy: 'bg-[#10243A] text-white border-[#10243A]',
  amber: 'bg-[#F4A62A]/15 text-[#92400E] border-[#F4A62A]/35',
  neutral: 'bg-slate-100 text-[#64748B] border-slate-200',
};

export function StatusBadge({
  tone = 'neutral',
  children,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Automatically maps common operational status strings to semantic badge tones.
 */
export function getToneForStatus(status: string | null | undefined): BadgeTone {
  const s = (status ?? '').trim().toLowerCase();
  if (
    s.includes('paid') ||
    s.includes('approved') ||
    s.includes('delivered') ||
    s.includes('active') ||
    s.includes('completed') ||
    s.includes('ready_stock') ||
    s.includes('released') ||
    s === 'yes' ||
    s === 'true'
  ) {
    return 'success';
  }
  if (
    s.includes('pending') ||
    s.includes('awaiting') ||
    s.includes('pre_order') ||
    s.includes('in_transit') ||
    s.includes('customs') ||
    s.includes('review') ||
    s.includes('partial') ||
    s.includes('quoted')
  ) {
    return 'warning';
  }
  if (
    s.includes('failed') ||
    s.includes('rejected') ||
    s.includes('cancelled') ||
    s.includes('inactive') ||
    s.includes('suspended') ||
    s.includes('expired')
  ) {
    return 'danger';
  }
  if (
    s.includes('shipped') ||
    s.includes('procurement') ||
    s.includes('processing') ||
    s.includes('staff')
  ) {
    return 'info';
  }
  return 'neutral';
}
