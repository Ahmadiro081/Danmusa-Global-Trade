import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Info, XCircle } from 'lucide-react';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label="Loading content"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 w-full animate-pulse rounded-lg border border-slate-200/80 bg-slate-100"
        />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
          <div className="space-y-2.5 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({
  title = 'Unable to load data',
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/5 p-4 text-sm text-[#991B1B] sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" />
        <div>
          <p className="font-semibold text-[#7F1D1D]">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#991B1B]">
            {message}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function AlertBanner({
  tone = 'info',
  title,
  message,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
}) {
  const styles = {
    info: {
      box: 'border-[#2563EB]/25 bg-[#EFF6FF] text-[#1E3A8A]',
      icon: <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />,
    },
    success: {
      box: 'border-[#16865C]/25 bg-[#16865C]/10 text-[#065F46]',
      icon: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16865C]" />,
    },
    warning: {
      box: 'border-[#D97706]/30 bg-[#FEF7E7] text-[#92400E]',
      icon: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />,
    },
    danger: {
      box: 'border-[#DC2626]/25 bg-[#DC2626]/5 text-[#991B1B]',
      icon: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />,
    },
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles.box}`}>
      {styles.icon}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F7FA] text-[#10243A] ring-1 ring-slate-200">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="font-display text-base font-bold text-[#10243A]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#64748B]">
        {description}
      </p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function IntegrationNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-[#F5F7FA] px-4 py-3.5 text-xs text-[#64748B]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
      <div>
        <p className="font-semibold text-[#10243A]">{title}</p>
        <p className="mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
