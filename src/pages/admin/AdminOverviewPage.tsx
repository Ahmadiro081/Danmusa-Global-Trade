import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/StateViews';
import { RBAC_ROLES } from '../../config/app.config';
import {
  fetchPlatformHealth,
  probeAdminAuthStatus,
  type HealthResponse,
} from '../../services/apiClient';
import type { RoleDefinition } from '../../types/domain';
import { ADMIN_PORTAL_NAV } from './adminModules';

const ROLE_COLUMNS: readonly TableColumn<RoleDefinition>[] = [
  {
    key: 'name',
    header: 'Role Title',
    render: (role) => (
      <span className="font-semibold text-[#0B1E3D]">{role.name}</span>
    ),
  },
  {
    key: 'slug',
    header: 'System Slug',
    render: (role) => <span className="font-mono text-xs">{role.slug}</span>,
  },
  {
    key: 'scope',
    header: 'Tier',
    render: (role) => (
      <span className="capitalize text-xs text-slate-600">{role.scope}</span>
    ),
  },
  {
    key: 'domains',
    header: 'Authorized Domains',
    render: (role) => (
      <span className="text-xs text-slate-600">{role.keyDomains.join(' · ')}</span>
    ),
  },
];

export function AdminOverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [authProbe, setAuthProbe] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDiagnostics() {
      try {
        const [healthRes, adminProbeRes] = await Promise.all([
          fetchPlatformHealth(),
          probeAdminAuthStatus(),
        ]);
        if (!active) return;
        setHealth(healthRes);
        const message =
          'message' in adminProbeRes.payload && adminProbeRes.payload.message
            ? adminProbeRes.payload.message
            : 'error' in adminProbeRes.payload
              ? adminProbeRes.payload.error
              : 'Protected';
        setAuthProbe({ status: adminProbeRes.status, message });
      } catch (err) {
        if (!active) return;
        setHealthError(
          err instanceof Error ? err.message : 'Unable to reach platform API.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDiagnostics();
    return () => {
      active = false;
    };
  }, []);

  const integrationEntries = health
    ? [
        {
          label: 'Supabase Browser Auth',
          ready: health.integrations.supabaseClient,
          env: 'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY',
        },
        {
          label: 'Supabase Server Admin & DB',
          ready: health.integrations.supabaseAdmin,
          env: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
        },
        {
          label: 'Cloudinary Media Storage',
          ready: health.integrations.cloudinary,
          env: 'CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET',
        },
        {
          label: 'Resend Email Service',
          ready: health.integrations.resend,
          env: 'RESEND_API_KEY',
        },
        {
          label: 'WhatsApp Business API',
          ready: health.integrations.whatsapp,
          env: 'WHATSAPP_BUSINESS_TOKEN + PHONE_NUMBER_ID',
        },
      ]
    : [];

  return (
    <PortalLayout
      portalTitle="Admin Operations"
      portalSubtitle="Stage 1 Foundation Preview"
      breadcrumbCurrent="Overview"
      navItems={ADMIN_PORTAL_NAV}
      topAction={
        <Link to="/admin/settings">
          <Button variant="outline" size="sm">
            System Settings
          </Button>
        </Link>
      }
    >
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-[#0B1E3D]">
          Administrative Operations Overview
        </h1>
        <p className="text-sm text-slate-600">
          Stage 1 architectural console showing live backend integration readiness and the
          10-role RBAC structure.
        </p>
      </div>

      {/* Explicit Fail-Closed Security Notice */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-800 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">
              Security Notice: Interface Structure Preview Only (Fail-Closed Backend)
            </h2>
            <p className="text-xs leading-relaxed text-amber-900">
              No fake administrative authentication or simulated business telemetry is
              permitted. All protected backend routes (e.g.{' '}
              <code className="font-mono">/api/admin/*</code>) enforce fail-closed RBAC
              verification and currently return{' '}
              <span className="font-mono font-semibold">
                {authProbe ? `HTTP ${authProbe.status}` : 'HTTP 503/401'}
              </span>{' '}
              until Supabase Auth and PostgreSQL staff policies are configured.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : healthError ? (
        <ErrorBanner title="Backend API Unreachable" message={healthError} />
      ) : (
        <Card>
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1E3D]">
                External Integration Readiness (Live Server Check)
              </h2>
              <p className="text-xs text-slate-500">
                Reported directly by <code className="font-mono">/api/health</code>{' '}
                without exposing secret keys.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500">{health?.stage}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrationEntries.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-slate-200 bg-slate-50 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0B1E3D]">
                    {item.label}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      item.ready ? 'text-emerald-700' : 'text-amber-800'
                    }`}
                  >
                    {item.ready ? 'Configured' : 'Pending'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500 truncate">
                  {item.env}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 10-Role RBAC Matrix */}
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B1E3D]">
            10-Role RBAC Governance Matrix
          </h2>
          <p className="text-xs text-slate-600">
            Enforced via PostgreSQL Row Level Security (<code className="font-mono">has_staff_role</code>)
            and Express server middleware.
          </p>
        </div>

        <DataTable
          columns={ROLE_COLUMNS}
          rows={RBAC_ROLES}
          rowKey={(role) => role.slug}
        />
      </div>
    </PortalLayout>
  );
}
