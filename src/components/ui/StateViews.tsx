import { AlertTriangle, Info, Layers } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="space-y-3 border border-slate-200 rounded-lg bg-white p-4"
      aria-busy="true"
      aria-label="Loading content"
    >
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-9 w-full rounded bg-slate-100"
        />
      ))}
    </div>
  );
}

export function ErrorBanner({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-900"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-red-700 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-red-800">{message}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[#0B1E3D]">
        <Layers className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-semibold text-[#0B1E3D]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function IntegrationNotice({
  title,
  description,
  requirements,
}: {
  title: string;
  description: string;
  requirements?: readonly string[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-slate-800">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 text-[#0B1E3D] mt-0.5" aria-hidden="true" />
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-[#0B1E3D]">{title}</h3>
          <p className="text-xs leading-relaxed text-slate-600">{description}</p>
          {requirements && requirements.length > 0 ? (
            <p className="text-xs text-slate-500">
              Pending integration dependencies: {requirements.join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
